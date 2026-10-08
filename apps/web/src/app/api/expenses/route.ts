import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { expenseDTO, pageDTO } from "@/lib/serialize";
import { expenseSchema } from "@my-store/shared-utils";
import { postExpenseLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** GET /api/expenses?from=&to=&page=&pageSize= (YYYY-MM-DD dates) */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const where = {
      storeId: user.storeId,
      ...(from || to
        ? {
            date: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
            },
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.findMany({
        where,
        include: { category: true },
        orderBy: { date: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(pageDTO(items.map(expenseDTO), total, page, pageSize));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/expenses — record an expense + ledger entry */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = expenseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const expense = await prisma.$transaction(async (tx: any) => {
      const created = await tx.expense.create({
        data: {
          storeId: user.storeId,
          title: data.title,
          amount: data.amount,
          date: data.date ? new Date(data.date) : new Date(),
          note: data.note || null,
          categoryId: data.categoryId || null,
          createdById: user.id,
        },
        include: { category: true },
      });

      await postExpenseLedger(tx, user.storeId, created.id, data.amount, data.title);
      return created;
    });

    return NextResponse.json(expenseDTO(expense), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
