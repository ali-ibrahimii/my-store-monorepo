// ============================================================
// سرویس بارکد — تولید EAN-13 یکتا برای محصولات یک فروشگاه
//
// چرا این‌جا و نه داخل route؟
//   هم `POST /api/products` (تولید خودکار هنگام ثبت محصول جدید) و هم
//   `POST /api/products/barcodes` (تب «بارکدها») به همین منطق نیاز دارند:
//   «یک کد بساز که در این فروشگاه قبلاً ثبت نشده باشد».
//
// نکته‌ی MongoDB: روی `{ storeId, barcode }` ایندکس unique داریم؛ پس اگر
// دو درخواست هم‌زمان یک کد را بسازند، دومی با خطای duplicate رد می‌شود و
// ما دوباره تلاش می‌کنیم (retry) — نه اینکه کد تکراری ثبت شود.
// ============================================================

import {
  GS1_IRAN_PREFIX,
  generateEan13,
  isBlankBarcode,
  isValidEan13,
  normalizeBarcode,
  storeCodeFromId,
} from "@my-store/shared-utils";

import { collections, idOf, oid } from "./db";
import type { ProductDoc } from "./models";

export interface GenerateBarcodeOptions {
  /** پیشوند GS1 — پیش‌فرض ۶۲۸ (ایران) */
  prefix?: string;
  /** چند بار تلاش کنیم تا کد غیرتکراری پیدا شود */
  attempts?: number;
}

/** مجموعه‌ی بارکدهای ثبت‌شده‌ی فروشگاه (برای غیرتکراری بودن سریع) */
export async function usedBarcodes(storeId: string): Promise<Set<string>> {
  const { products } = await collections();
  const docs = await products.find({ storeId }, { projection: { barcode: 1 } }).toArray();
  return new Set(
    docs.map((doc) => normalizeBarcode(doc.barcode)).filter((code) => code.length > 0),
  );
}

/** یک بارکد EAN-13 تازه که در این فروشگاه تکراری نباشد. */
export async function generateUniqueBarcode(
  storeId: string,
  options: GenerateBarcodeOptions = {},
): Promise<string> {
  const attempts = Math.max(1, options.attempts ?? 25);
  const used = await usedBarcodes(storeId);
  const storeCode = storeCodeFromId(storeId);
  const prefix = options.prefix || GS1_IRAN_PREFIX;

  for (let i = 0; i < attempts; i++) {
    const code = generateEan13({ prefix, storeCode });
    if (!used.has(code)) return code;
  }

  // تصادم پشت‌سرهم (تعداد محصولات خیلی زیاد): از سریال ترتیبی استفاده کن
  for (let serial = 0; serial < 1_000_000; serial++) {
    const code = generateEan13({ prefix, storeCode, serial });
    if (!used.has(code)) return code;
  }

  throw new Error("ساخت بارکد یکتا ممکن نشد — تعداد محصولات از ظرفیت بارکدگذاری بیشتر است");
}

/** چند بارکد تازه (هنوز ثبت نشده) که در این فروشگاه تکراری نباشند. */
export async function generateBarcodeBatch(
  storeId: string,
  count: number,
  options: GenerateBarcodeOptions = {},
): Promise<string[]> {
  const total = Math.max(0, Math.min(500, Math.trunc(count) || 0));
  if (total === 0) return [];

  const used = await usedBarcodes(storeId);
  const storeCode = storeCodeFromId(storeId);
  const prefix = options.prefix || GS1_IRAN_PREFIX;
  const codes = new Set<string>();

  for (let guard = 0; codes.size < total && guard < total * 50 + 500; guard++) {
    const code = generateEan13({ prefix, storeCode });
    if (!used.has(code)) codes.add(code);
  }

  // تکمیل با سریال ترتیبی اگر تصادفی جا نماند
  for (let serial = 0; codes.size < total && serial < 1_000_000; serial++) {
    const code = generateEan13({ prefix, storeCode, serial });
    if (!used.has(code)) codes.add(code);
  }

  return [...codes];
}

/** محصولاتی که هنوز بارکد ندارند (اختیاری: محدود به چند شناسه) */
export async function productsWithoutBarcode(
  storeId: string,
  productIds?: string[],
): Promise<ProductDoc[]> {
  const { products } = await collections();
  const docs = await products.find({ storeId }).sort({ name: 1 }).toArray();
  const only = productIds && productIds.length > 0 ? new Set(productIds) : null;
  return docs.filter((doc) => isBlankBarcode(doc.barcode) && (!only || only.has(idOf(doc._id))));
}

/**
 * ثبت یک بارکد روی محصول.
 * اگر `barcode` خالی باشد، خودش یک EAN-13 تازه می‌سازد.
 */
export async function assignBarcodeToProduct(
  storeId: string,
  productId: string,
  barcode?: string,
): Promise<{ ok: true; barcode: string } | { ok: false; error: string }> {
  const { products } = await collections();
  const wanted = normalizeBarcode(barcode ?? "");

  if (wanted && !isValidEan13(wanted) && !/^[\x20-\x7E]{4,48}$/.test(wanted)) {
    return { ok: false, error: "بارکد نامعتبر است" };
  }

  const product = await products.findOne({ _id: oid(productId), storeId });
  if (!product) return { ok: false, error: "محصول یافت نشد" };

  const code = wanted || (await generateUniqueBarcode(storeId));

  if (wanted) {
    const clash = await products.findOne({ storeId, barcode: code });
    if (clash && idOf(clash._id) !== productId) {
      return { ok: false, error: "این بارکد روی محصول دیگری ثبت شده است" };
    }
  }

  await products.updateOne(
    { _id: oid(productId), storeId },
    { $set: { barcode: code, updatedAt: new Date() } },
  );

  return { ok: true, barcode: code };
}

/** چند بارکد برای چند محصول (همه با هم) — خروجی: نقشه‌ی productId → barcode */
export async function assignBarcodes(
  storeId: string,
  assignments: { productId: string; barcode?: string }[],
): Promise<{ productId: string; barcode?: string; error?: string }[]> {
  const results: { productId: string; barcode?: string; error?: string }[] = [];
  for (const item of assignments) {
    const result = await assignBarcodeToProduct(storeId, item.productId, item.barcode);
    results.push(
      result.ok
        ? { productId: item.productId, barcode: result.barcode }
        : { productId: item.productId, error: result.error },
    );
  }
  return results;
}
