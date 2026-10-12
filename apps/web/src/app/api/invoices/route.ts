import { NextResponse } from "next/server";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listInvoices } from "@/lib/repositories";
import { createInvoice } from "@/lib/invoice-service";
import { invoiceSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/invoices?status=&from=&to=&page=&pageSize= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const page = await listInvoices(user.storeId, {
      status: searchParams.get("status") || undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to + "T23:59:59.999Z") : undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });

    return NextResponse.json(page);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/invoices — ساخت فاکتور فروش
 * (آیتم‌ها + کاهش موجودی + حرکت انبار + دفتر کل + پرداخت اولیه + مانده مشتری)
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = invoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const invoice = await createInvoice(
      {
        customerId: data.customerId || null,
        items: data.items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.unitPrice,
        })),
        discount: data.discount,
        tax: data.tax,
        note: data.note || null,
        issueNow: data.issueNow,
        payment: data.payment
          ? { method: data.payment.method, amount: data.payment.amount, note: data.payment.note }
          : null,
      },
      user,
    );

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
