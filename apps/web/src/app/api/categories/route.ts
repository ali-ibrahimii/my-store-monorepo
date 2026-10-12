import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listCategories } from "@/lib/repositories";
import { categoryDTO, type CategoryRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { categorySchema, slugify } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    return NextResponse.json(await listCategories(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const slug = parsed.data.slug || slugify(parsed.data.name, "category");
    const exists = await getAdmin()
      .from("categories")
      .select("id")
      .eq("store_id", user.storeId)
      .eq("slug", slug)
      .maybeSingle();
    if (exists.data) {
      return NextResponse.json({ error: "دسته‌ای با این نام قبلاً ثبت شده است" }, { status: 409 });
    }

    const inserted = await getAdmin()
      .from("categories")
      .insert({ store_id: user.storeId, name: parsed.data.name, slug })
      .select("*")
      .single();
    return NextResponse.json(categoryDTO(assertData(inserted) as CategoryRow), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
