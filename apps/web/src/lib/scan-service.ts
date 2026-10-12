import type { CreateScanInput, ScanEvent, ScanType } from "@my-store/shared-types";
import { normalizeForLookup } from "@my-store/shared-utils";

import { scanBus } from "./realtime";
import { dbErrorMessage, getAdmin } from "./supabase";

export async function recordScan(
  input: CreateScanInput,
  userId: string,
  storeId: string,
): Promise<ScanEvent> {
  const barcode = normalizeForLookup(input.barcode);
  if (!barcode) {
    throw new Error("بارکد نامعتبر است (EAN-13 / UPC-A / Code128)");
  }
  const type: ScanType = input.type ?? "CHECK_IN";
  const result = await getAdmin().rpc("record_scan", {
    payload: {
      store_id: storeId,
      user_id: userId,
      barcode,
      type,
      qty: input.qty ?? 1,
      device: input.device || null,
      note: input.note || null,
    },
  });
  if (result.error) throw new Error(dbErrorMessage(result.error));
  const row = result.data as {
    id: string;
    product_id: string | null;
    barcode: string;
    type: ScanType;
    qty: number;
    device: string | null;
    note: string | null;
    user_id: string | null;
    user_name: string | null;
    store_id: string;
    created_at: string;
    product_name: string | null;
    sale_price: number | string | null;
    stock: number | null;
  };
  const event: ScanEvent = {
    id: row.id,
    productId: row.product_id,
    barcode: row.barcode,
    type: row.type,
    qty: Number(row.qty),
    device: row.device,
    note: row.note,
    userId: row.user_id,
    userName: row.user_name,
    storeId: row.store_id,
    createdAt: row.created_at,
    product: row.product_id
      ? {
          id: row.product_id,
          name: row.product_name ?? "",
          barcode: row.barcode,
          salePrice: Number(row.sale_price ?? 0),
          stock: Number(row.stock ?? 0),
        }
      : null,
  };
  scanBus.publish(event);
  return event;
}
