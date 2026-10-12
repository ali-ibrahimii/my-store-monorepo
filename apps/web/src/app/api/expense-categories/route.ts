import { NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listExpenseCategories } from "@/lib/repositories";
import { assertData, getAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    return NextResponse.json(await listExpenseCategories(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

const createSchema = z.object({
  name: z.string().min(2, "نام دسته را وارد کنید"),
});

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const exists = await getAdmin()
      .from("expense_categories")
      .select("id")
      .eq("store_id", user.storeId)
      .eq("name", parsed.data.name)
      .maybeSingle();
    if (exists.data) {
      return NextResponse.json({ error: "این دسته هزینه قبلاً ثبت شده است" }, { status: 409 });
    }
    const inserted = assertData(
      await getAdmin()
        .from("expense_categories")
        .insert({ store_id: user.storeId, name: parsed.data.name })
        .select("id, name, store_id")
        .single(),
    ) as { id: string; name: string; store_id: string };
    return NextResponse.json(
      { id: inserted.id, name: inserted.name, storeId: inserted.store_id },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
