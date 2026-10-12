import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listExpenses } from "@/lib/repositories";
import { expenseDTO, type ExpenseRow } from "@/lib/serialize";
import { assertData, dbErrorMessage, getAdmin } from "@/lib/supabase";
import { expenseSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const page = await listExpenses(user.storeId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to + "T23:59:59.999Z") : undefined,
      search: searchParams.get("search")?.trim() || undefined,
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 50,
    });
    return NextResponse.json(page);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
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
    const created = await getAdmin().rpc("create_expense", {
      payload: {
        store_id: user.storeId,
        created_by: user.id,
        title: data.title,
        amount: data.amount,
        date: data.date || new Date().toISOString(),
        note: data.note || null,
        category_id: data.categoryId || null,
      },
    });
    if (created.error) throw new Error(dbErrorMessage(created.error));
    const id = (created.data as { id: string }).id;
    const row = assertData(
      await getAdmin()
        .from("expenses")
        .select("*, expense_categories(id, name, store_id)")
        .eq("id", id)
        .single(),
    ) as ExpenseRow;
    return NextResponse.json(expenseDTO(row), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
