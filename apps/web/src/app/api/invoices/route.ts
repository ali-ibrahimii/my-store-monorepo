import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { invoiceDTO, pageDTO } from "@/lib/serialize";
import { invoiceSchema } from "@my-store/shared-utils";
import { nextNumber, postInvoiceLedger, postPaymentLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** GET /api/invoices?status=&page=&pageSize= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const where = {
      storeId: user.storeId,
      ...(status ? { status: status as never } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(pageDTO(items.map(invoiceDTO), total, page, pageSize));
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/invoices — create a sales invoice.
 * One DB transaction: invoice + items + stock decrement + inventory movements
 * + double-entry ledger + optional initial payment + customer balance.
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

    const invoice = await prisma.$transaction(async (tx: any) => {
      // Load products & validate stock
      const products = await tx.product.findMany({
        where: { id: { in: data.items.map((i: any) => i.productId) }, storeId: user.storeId },
      });
      if (products.length !== data.items.length) {
        throw new Error("یکی از محصولات یافت نشد");
      }
      for (const item of data.items) {
        const product = products.find((p: any) => p.id === item.productId)!;
        if (product.stock < item.qty) {
          throw new Error(`موجودی «${product.name}» کافی نیست (موجودی: ${product.stock})`);
        }
      }

      const subtotal = data.items.reduce((sum: any, i: any) => sum + i.qty * i.unitPrice, 0);
      const discount = data.discount ?? 0;
      const tax = data.tax ?? 0;
      const total = Math.max(0, subtotal - discount + tax);

      const issueNow = data.issueNow ?? true;
      const paymentAmount = Math.min(data.payment?.amount ?? 0, total);
      const paidAmount = issueNow ? paymentAmount : 0;
      const status = !issueNow
        ? "DRAFT"
        : paidAmount >= total
          ? "PAID"
          : paidAmount > 0
            ? "PARTIAL"
            : "ISSUED";

      const number = await nextNumber(tx, user.storeId, "invoice");

      const created = await tx.invoice.create({
        data: {
          storeId: user.storeId,
          number,
          status,
          customerId: data.customerId || null,
          subtotal,
          discount,
          tax,
          total,
          paidAmount,
          note: data.note || null,
          createdById: user.id,
          issuedAt: issueNow ? new Date() : null,
          items: {
            create: data.items.map((item: any) => ({
              productId: item.productId,
              qty: item.qty,
              unitPrice: item.unitPrice,
              total: item.qty * item.unitPrice,
            })),
          },
          ...(paymentAmount > 0
            ? {
                payments: {
                  create: {
                    method: data.payment!.method,
                    amount: paymentAmount,
                    note: data.payment!.note || null,
                  },
                },
              }
            : {}),
        },
        include: {
          items: { include: { product: true } },
          customer: true,
          payments: true,
        },
      });

      if (issueNow) {
        // Decrement stock + inventory movements
        for (const item of data.items) {
          const product = products.find((p: any) => p.id === item.productId)!;
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: item.qty } },
          });
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,
              type: "SALE",
              qty: -item.qty,
              refType: "invoice",
              refId: created.id,
              note: `فاکتور ${number}`,
            },
          });
        }

        // Customer balance (unpaid part becomes receivable)
        if (created.customerId) {
          const unpaid = total - paidAmount;
          if (unpaid > 0) {
            await tx.customer.update({
              where: { id: created.customerId },
              data: { balance: { increment: unpaid } },
            });
          }
        }

        // Double-entry ledger
        const costOfGoods = data.items.reduce((sum: any, item: any) => {
          const product = products.find((p: any) => p.id === item.productId)!;
          return sum + item.qty * Number(product.costPrice);
        }, 0);

        await postInvoiceLedger(
          tx,
          {
            id: created.id,
            storeId: user.storeId,
            total,
            paidAmount,
            costOfGoods,
            customerId: created.customerId,
          },
          `فاکتور ${number}`,
        );

        if (paymentAmount > 0) {
          await postPaymentLedger(tx, user.storeId, created.id, paymentAmount, `پرداخت فاکتور ${number}`);
        }
      }

      return created;
    });

    return NextResponse.json(invoiceDTO(invoice), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
