import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections, idOf, idOrEmpty, oid, runInTransaction } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listExpenses } from "@/lib/repositories";
import { expenseDTO } from "@/lib/serialize";
import { expenseSchema } from "@my-store/shared-utils";
import { postExpenseLedger } from "@/lib/ledger";

export const dynamic = "force-dynamic";

/** GET /api/expenses?from=&to=&page=&pageSize= (تاریخ‌ها YYYY-MM-DD) */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const page = await listExpenses(user.storeId, {
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

/** POST /api/expenses — ثبت هزینه + سند دفتر کل */
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

    const expense = await runInTransaction(async (session) => {
      const { expenses, expenseCategories } = await collections();

      const _id = new ObjectId();
      const now = new Date();
      await expenses.insertOne(
        {
          _id,
          storeId: user.storeId,
          title: data.title,
          amount: Number(data.amount),
          date: data.date ? new Date(data.date) : now,
          note: data.note || null,
          receiptUrl: null,
          categoryId: idOrEmpty(data.categoryId) || null,
          createdById: user.id,
          createdAt: now,
        },
        { session },
      );

      await postExpenseLedger(user.storeId, idOf(_id), Number(data.amount), data.title, session);

      const doc = await expenses.findOne({ _id }, { session });
      const category = doc?.categoryId
        ? await expenseCategories.findOne({ _id: oid(doc.categoryId) }, { session })
        : null;
      return expenseDTO(doc!, category);
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
