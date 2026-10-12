import {
  GS1_IRAN_PREFIX,
  generateEan13,
  isBlankBarcode,
  isValidEan13,
  normalizeBarcode,
  storeCodeFromId,
} from "@my-store/shared-utils";

import { assertData, getAdmin } from "./supabase";

export interface GenerateBarcodeOptions {
  prefix?: string;
  attempts?: number;
}

export async function usedBarcodes(storeId: string): Promise<Set<string>> {
  const result = await getAdmin().from("products").select("barcode").eq("store_id", storeId);
  const rows = assertData(result) as { barcode: string | null }[];
  return new Set(rows.map((row) => normalizeBarcode(row.barcode ?? "")).filter((code) => code.length > 0));
}

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

  for (let serial = 0; serial < 1_000_000; serial++) {
    const code = generateEan13({ prefix, storeCode, serial });
    if (!used.has(code)) return code;
  }

  throw new Error("ساخت بارکد یکتا ممکن نشد");
}

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
  for (let serial = 0; codes.size < total && serial < 1_000_000; serial++) {
    const code = generateEan13({ prefix, storeCode, serial });
    if (!used.has(code)) codes.add(code);
  }
  return [...codes];
}

export async function productsWithoutBarcode(storeId: string, productIds?: string[]) {
  const result = await getAdmin()
    .from("products")
    .select("id, name, barcode")
    .eq("store_id", storeId)
    .order("name");
  const rows = assertData(result) as { id: string; name: string; barcode: string | null }[];
  const only = productIds && productIds.length > 0 ? new Set(productIds) : null;
  return rows.filter((row) => isBlankBarcode(row.barcode) && (!only || only.has(row.id)));
}

export async function assignBarcodeToProduct(
  storeId: string,
  productId: string,
  barcode?: string,
): Promise<{ ok: true; barcode: string } | { ok: false; error: string }> {
  const wanted = normalizeBarcode(barcode ?? "");
  if (wanted && !isValidEan13(wanted) && !/^[\x20-\x7E]{4,48}$/.test(wanted)) {
    return { ok: false, error: "بارکد نامعتبر است" };
  }

  const existing = await getAdmin()
    .from("products")
    .select("id")
    .eq("store_id", storeId)
    .eq("id", productId)
    .maybeSingle();
  if (existing.error) return { ok: false, error: existing.error.message };
  if (!existing.data) return { ok: false, error: "محصول یافت نشد" };

  const code = wanted || (await generateUniqueBarcode(storeId));
  if (wanted) {
    const clash = await getAdmin()
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("barcode", code)
      .maybeSingle();
    if (clash.data && clash.data.id !== productId) {
      return { ok: false, error: "این بارکد روی محصول دیگری ثبت شده است" };
    }
  }

  const updated = await getAdmin()
    .from("products")
    .update({ barcode: code, updated_at: new Date().toISOString() })
    .eq("id", productId)
    .eq("store_id", storeId);
  if (updated.error) return { ok: false, error: updated.error.message };
  return { ok: true, barcode: code };
}

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
