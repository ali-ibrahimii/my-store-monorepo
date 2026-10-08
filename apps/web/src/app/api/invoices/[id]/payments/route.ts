import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { invoiceDTO } from "@/lib/serialize";
import { postPaymentLedger } from "@/lib/ledger";
import { z } from "zod";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]),
  amount: z.coerce.number().positive("مبلغ پرداخت باید بیشتر از صفر باشد"),
  note: z.string().trim().optional().or(z.literal("")),
});

/** POST /api/invoices/:id/payments — record a payment against an invoice */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const body = await request.json();
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const updated = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, storeId: user.storeId },
      });
      if (!invoice) throw new Error("فاکتور یافت نشد");

      const remaining = Number(invoice.total) - Number(invoice.paidAmount);
      if (parsed.data.amount > remaining + 0.01) {
        throw new Error(`مبلغ پرداخت بیشتر از بدهی باقیمانده است (باقیمانده: ${remaining})`);
      }

      await tx.payment.create({
        data: {
          invoiceId: id,
          method: parsed.data.method,
          amount: parsed.data.amount,
          note: parsed.data.note || null,
        },
      });

      const paidAmount = Number(invoice.paidAmount) + parsed.data.amount;
      const total = Number(invoice.total);
      const status = paidAmount >= total ? "PAID" : "PARTIAL";

      const result = await tx.invoice.update({
        where: { id },
        data: { paidAmount, status: status as never },
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
      });

      await postPaymentLedger(tx, user.storeId, id, parsed.data.amount, "پرداخت فاکتور");

      if (invoice.customerId) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: { balance: { decrement: parsed.data.amount } },
        });
      }

      return result;
    });

    return NextResponse.json(invoiceDTO(updated), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
