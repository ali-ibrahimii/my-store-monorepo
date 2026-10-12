import { NextResponse } from "next/server";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getInvoice } from "@/lib/repositories";
import { setInvoiceStatus } from "@/lib/invoice-service";
import type { InvoiceStatus } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const STATUSES: InvoiceStatus[] = ["DRAFT", "ISSUED", "PAID", "PARTIAL", "CANCELLED"];

/** GET /api/invoices/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const invoice = await getInvoice(user.storeId, id);
    if (!invoice) {
      return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/invoices/:id — تغییر وضعیت (مثلاً ISSUED → PAID / CANCELLED) */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const body = await request.json();
    const status = String(body?.status ?? "");
    if (!STATUSES.includes(status as InvoiceStatus)) {
      return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    }

    const invoice = await setInvoiceStatus(id, status as InvoiceStatus, user);
    return NextResponse.json(invoice);
  } catch (error) {
    return handleRouteError(error);
  }
}
