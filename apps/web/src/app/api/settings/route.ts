import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getStore } from "@/lib/repositories";
import { storeDTO, type StoreRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { storeSettingsSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const store = await getStore(user.storeId);
    if (!store) return NextResponse.json({ error: "فروشگاه یافت نشد" }, { status: 404 });
    return NextResponse.json(store);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const parsed = storeSettingsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const updated = assertData(
      await getAdmin()
        .from("stores")
        .update({
          name: data.name,
          phone: data.phone || null,
          address: data.address || null,
          email: data.email || null,
          currency: data.currency || "IRR",
          tax_rate: data.taxRate ?? 0,
          invoice_prefix: (data.invoicePrefix || "INV").toUpperCase(),
          receipt_footer: data.receiptFooter || null,
          low_stock_default: data.lowStockDefault ?? 5,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.storeId)
        .select("*")
        .single(),
    ) as StoreRow;
    return NextResponse.json(storeDTO(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
