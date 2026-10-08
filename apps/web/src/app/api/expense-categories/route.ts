import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

/** GET /api/expense-categories */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const categories = await prisma.expenseCategory.findMany({
      where: { storeId: user.storeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
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

    const category = await prisma.expenseCategory.create({
      data: { storeId: user.storeId, name: parsed.data.name },
    });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
