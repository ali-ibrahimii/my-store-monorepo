import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listPurchases } from "@/lib/repositories";
import { purchaseDTO, type PurchaseRow } from "@/lib/serialize";
import { assertData, dbErrorMessage, getAdmin } from "@/lib/supabase";
import { purchaseSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

const SELECT = `
  id, number, supplier, total, paid_amount, note, store_id, created_by, created_at, updated_at,
  purchase_items (
    id, purchase_id, product_id, qty, unit_cost, total,
    products (id, name, sku, barcode, description, cost_price, sale_price, stock, low_stock_threshold, category_id, store_id, created_at, updated_at)
  )
`;

export async function GET() {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    return NextResponse.json(await listPurchases(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const parsed = purchaseSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const created = await getAdmin().rpc("create_purchase", {
      payload: {
        store_id: user.storeId,
        created_by: user.id,
        supplier: data.supplier || null,
        note: data.note || null,
        paid_amount: data.paidAmount ?? 0,
        items: data.items.map((item) => ({
          product_id: item.productId,
          qty: item.qty,
          unit_cost: item.unitCost,
        })),
      },
    });
    if (created.error) throw new Error(dbErrorMessage(created.error));
    const id = (created.data as { id: string }).id;
    const row = assertData(
      await getAdmin().from("purchases").select(SELECT).eq("id", id).single(),
    ) as unknown as PurchaseRow;
    return NextResponse.json(purchaseDTO(row), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
