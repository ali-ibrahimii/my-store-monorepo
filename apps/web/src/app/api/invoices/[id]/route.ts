import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { invoiceDTO } from "@/lib/serialize";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/invoices/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, storeId: user.storeId },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
      },
    });
    if (!invoice) {
      return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });
    }
    return NextResponse.json(invoiceDTO(invoice));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/invoices/:id — update status (e.g. ISSUED -> PAID / CANCELLED) */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const body = await request.json();
    const status = String(body?.status ?? "");
    if (!["DRAFT", "ISSUED", "PAID", "PARTIAL", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "وضعیت نامعتبر است" }, { status: 400 });
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id, storeId: user.storeId },
    });
    if (!invoice) {
      return NextResponse.json({ error: "فاکتور یافت نشد" }, { status: 404 });
    }

    // If transitioning DRAFT -> ISSUED, post the ledger now
    if (invoice.status === "DRAFT" && status === "ISSUED") {
      const updated = await prisma.$transaction(async (tx: any) => {
        const items = await tx.invoiceItem.findMany({
          where: { invoiceId: id },
          include: { product: true },
        });
        const costOfGoods = items.reduce(
          (sum: any, item: any) => sum + item.qty * Number(item.product.costPrice),
          0,
        );
        const updatedInvoice = await tx.invoice.update({
          where: { id },
          data: { status: "ISSUED", issuedAt: new Date() },
          include: {
            items: { include: { product: true } },
            customer: true,
            payments: true,
          },
        });
        const { postInvoiceLedger } = await import("@/lib/ledger");
        await postInvoiceLedger(
          tx,
          {
            id,
            storeId: user.storeId,
            total: Number(updatedInvoice.total),
            paidAmount: Number(updatedInvoice.paidAmount),
            costOfGoods,
            customerId: updatedInvoice.customerId,
          },
          `فاکتور ${updatedInvoice.number}`,
        );
        return updatedInvoice;
      });
      return NextResponse.json(invoiceDTO(updated));
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: status as never },
      include: {
        items: { include: { product: true } },
        customer: true,
        payments: true,
      },
    });
    return NextResponse.json(invoiceDTO(updated));
  } catch (error) {
    return handleRouteError(error);
  }
}
