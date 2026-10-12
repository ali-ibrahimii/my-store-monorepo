import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getCustomer, listInvoices } from "@/lib/repositories";
import { customerDTO, type CustomerRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { customerSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;
    const customer = await getCustomer(user.storeId, id);
    if (!customer) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });
    const invoices = await listInvoices(user.storeId, { page: 1, pageSize: 20 });
    return NextResponse.json({
      customer,
      invoices: invoices.items.filter((invoice) => invoice.customerId === id),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { id } = await context.params;
    const body = await request.json();
    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const updated = await getAdmin()
      .from("customers")
      .update({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
        ...(data.address !== undefined ? { address: data.address || null } : {}),
        ...(data.note !== undefined ? { note: data.note || null } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("store_id", user.storeId)
      .select("*")
      .maybeSingle();
    const row = assertData(updated) as CustomerRow | null;
    if (!row) return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });
    return NextResponse.json(customerDTO(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { id } = await context.params;
    const used = await getAdmin()
      .from("invoices")
      .select("id", { head: true, count: "exact" })
      .eq("store_id", user.storeId)
      .eq("customer_id", id);
    if ((used.count ?? 0) > 0) {
      return NextResponse.json(
        { error: "این مشتری فاکتور دارد و قابل حذف نیست" },
        { status: 409 },
      );
    }
    const deleted = await getAdmin().from("customers").delete().eq("id", id).eq("store_id", user.storeId);
    if (deleted.error) return NextResponse.json({ error: deleted.error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
