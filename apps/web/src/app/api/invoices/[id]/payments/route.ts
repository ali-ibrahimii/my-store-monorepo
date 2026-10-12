import { NextResponse } from "next/server";
import { z } from "zod";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { addPayment } from "@/lib/invoice-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const paymentSchema = z.object({
  method: z.enum(["CASH", "CARD", "TRANSFER", "CREDIT"]),
  amount: z.coerce.number().positive("مبلغ پرداخت باید بیشتر از صفر باشد"),
  note: z.string().trim().optional().or(z.literal("")),
});

/** POST /api/invoices/:id/payments — ثبت پرداخت روی فاکتور */
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

    const invoice = await addPayment(
      id,
      {
        method: parsed.data.method,
        amount: parsed.data.amount,
        note: parsed.data.note || null,
      },
      user,
    );

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
