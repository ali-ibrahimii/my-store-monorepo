import { prisma } from "@/lib/prisma";
import { scanBus } from "@/lib/realtime";
import { normalizeForLookup } from "@my-store/shared-utils";
import type { CreateScanInput, ScanEvent } from "@my-store/shared-types";

/**
 * Record a scan event:
 *  1. Normalize/validate the barcode (EAN-13 / UPC-A / Code128).
 *  2. Resolve the product (if registered).
 *  3. Persist the ScanEvent + adjust inventory (with an InventoryMovement).
 *  4. Broadcast to the real-time bus (SSE + Redis pub/sub).
 */
export async function recordScan(input: CreateScanInput, userId: string, storeId: string) {
  const barcode = normalizeForLookup(input.barcode);
  if (!barcode) {
    throw new Error("بارکد نامعتبر است (EAN-13 / UPC-A / Code128)");
  }

  const type = input.type ?? "CHECK_IN";
  const qty = input.qty ?? 1;

  const result = await prisma.$transaction(async (tx: any) => {
    const product = await tx.product.findUnique({
      where: { storeId_barcode: { storeId, barcode } },
    });

    // Stock delta per scan type (SALE / CHECK_OUT reduce stock)
    let stockDelta = 0;
    if (product) {
      if (type === "CHECK_IN") stockDelta = qty;
      else if (type === "CHECK_OUT" || type === "SALE") stockDelta = -qty;
      else if (type === "ADJUSTMENT") stockDelta = qty; // signed adjustment
    }

    const event = await tx.scanEvent.create({
      data: {
        productId: product?.id ?? null,
        barcode,
        type,
        qty,
        device: input.device || null,
        note: input.note || null,
        userId,
        storeId,
      },
      include: {
        product: { select: { id: true, name: true, barcode: true, salePrice: true, stock: true } },
        user: { select: { name: true, email: true } },
      },
    });

    if (product && stockDelta !== 0) {
      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: stockDelta } },
      });
      await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          type: type === "CHECK_IN" ? "SCAN_IN" : type === "SALE" ? "SALE" : "ADJUSTMENT",
          qty: stockDelta,
          refType: "scan",
          refId: event.id,
          note: `اسکن ${type}`,
        },
      });
      // reflect the new stock on the event payload
      if (event.product) event.product.stock += stockDelta;
    }

    return event;
  });

  const payload: ScanEvent = {
    id: result.id,
    productId: result.productId,
    barcode: result.barcode,
    type: result.type as ScanEvent["type"],
    qty: result.qty,
    device: result.device,
    note: result.note,
    userId: result.userId,
    userName: result.user?.name ?? result.user?.email ?? null,
    storeId: result.storeId,
    createdAt: result.createdAt.toISOString(),
    product: result.product
      ? {
          id: result.product.id,
          name: result.product.name,
          barcode: result.product.barcode,
          salePrice: Number(result.product.salePrice),
          stock: result.product.stock,
        }
      : null,
  };

  // init Redis (optional) and broadcast
  await scanBus.init();
  scanBus.publish(payload);

  return payload;
}
