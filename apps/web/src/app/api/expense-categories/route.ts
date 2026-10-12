import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { collections, idOf } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listExpenseCategories } from "@/lib/repositories";

export const dynamic = "force-dynamic";

/** GET /api/expense-categories */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    return NextResponse.json(await listExpenseCategories(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2, "نام دسته را وارد کنید"),
});

/** POST /api/expense-categories */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const { expenseCategories } = await collections();

    const exists = await expenseCategories.findOne({
      storeId: user.storeId,
      name: parsed.data.name,
    });
    if (exists) {
      return NextResponse.json({ error: "این دسته هزینه قبلاً ثبت شده است" }, { status: 409 });
    }

    const _id = new ObjectId();
    await expenseCategories.insertOne({
      _id,
      storeId: user.storeId,
      name: parsed.data.name,
    });

    const doc = await expenseCategories.findOne({ _id });
    return NextResponse.json(
      { id: idOf(doc?._id), name: doc?.name, storeId: idOf(doc?.storeId) },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
