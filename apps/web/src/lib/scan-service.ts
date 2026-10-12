// ============================================================
// سرویس اسکن — ثبت یک رویداد اسکن بارکد
//
//  1. بارکد نرمال‌سازی و اعتبارسنجی می‌شود (EAN-13 / UPC-A / Code128)
//  2. محصول متناظر پیدا می‌شود (ممکن است ثبت نشده باشد)
//  3. رویداد اسکن ذخیره + موجودی انبار اصلاح می‌شود
//  4. به‌صورت لحظه‌ای روی باس real-time (SSE + Redis) پخش می‌شود
// ============================================================

import { ObjectId } from "mongodb";
import { collections, idOf, idOrEmpty, oid, runInTransaction } from "@/lib/db";
import { scanBus } from "@/lib/realtime";
import { normalizeForLookup } from "@my-store/shared-utils";
import type { CreateScanInput, ScanEvent } from "@my-store/shared-types";

export async function recordScan(
  input: CreateScanInput,
  userId: string,
  storeId: string,
): Promise<ScanEvent> {
  const barcode = normalizeForLookup(input.barcode);
  if (!barcode) {
    throw new Error("بارکد نامعتبر است (EAN-13 / UPC-A / Code128)");
  }

  const type = input.type ?? "CHECK_IN";
  const qty = input.qty ?? 1;
  const userRef = idOrEmpty(userId) || null;

  const payload = await runInTransaction(async (session) => {
    const { products, scanEvents, inventoryMovements, users } = await collections();

    const product = await products.findOne({ storeId, barcode }, { session });
    const productRef = product ? idOf(product._id) : null;

    // تغییر موجودی بر اساس نوع اسکن
    let stockDelta = 0;
    if (product) {
      if (type === "CHECK_IN") stockDelta = qty;
      else if (type === "CHECK_OUT" || type === "SALE") stockDelta = -qty;
      else if (type === "ADJUSTMENT") stockDelta = qty; // اصلاح امضادار
    }

    const eventId = new ObjectId();
    const createdAt = new Date();
    await scanEvents.insertOne(
      {
        _id: eventId,
        productId: productRef,
        barcode,
        type,
        qty,
        device: input.device || null,
        note: input.note || null,
        userId: userRef,
        storeId,
        createdAt,
      },
      { session },
    );

    let updatedStock = product?.stock ?? 0;
    if (product && productRef && stockDelta !== 0) {
      await products.updateOne(
        { _id: product._id },
        { $inc: { stock: stockDelta }, $set: { updatedAt: new Date() } },
        { session },
      );
      await inventoryMovements.insertOne(
        {
          _id: new ObjectId(),
          productId: productRef,
          type: type === "CHECK_IN" ? "SCAN_IN" : type === "SALE" ? "SALE" : "ADJUSTMENT",
          qty: stockDelta,
          refType: "scan",
          refId: idOf(eventId),
          note: `اسکن ${type}`,
          createdAt: new Date(),
        },
        { session },
      );
      updatedStock = product.stock + stockDelta;
    }

    const user = userRef ? await users.findOne({ _id: oid(userRef) }, { session }) : null;

    return {
      id: idOf(eventId),
      productId: productRef,
      barcode,
      type,
      qty,
      device: input.device || null,
      note: input.note || null,
      userId: userRef,
      userName: user?.name ?? user?.email ?? null,
      storeId,
      createdAt: createdAt.toISOString(),
      product: product
        ? {
            id: productRef!,
            name: product.name,
            barcode: product.barcode,
            salePrice: Number(product.salePrice),
            stock: updatedStock,
          }
        : null,
    } satisfies ScanEvent;
  });

  // پخش لحظه‌ای (Redis اختیاری است؛ اگر نبود فقط درون‌حافظه‌ای کار می‌کند)
  await scanBus.init();
  scanBus.publish(payload);

  return payload;
}
