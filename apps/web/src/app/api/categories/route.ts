import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listCategories } from "@/lib/repositories";
import { categoryDTO } from "@/lib/serialize";
import { categorySchema, slugify } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/categories */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    return NextResponse.json(await listCategories(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/categories */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
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

    const { categories } = await collections();

    const exists = await categories.findOne({ storeId: user.storeId, slug });
    if (exists) {
      return NextResponse.json({ error: "دسته‌ای با این اسلاگ قبلاً ثبت شده است" }, { status: 409 });
    }

    const now = new Date();
    const _id = new ObjectId();
    await categories.insertOne({
      _id,
      storeId: user.storeId,
      name: parsed.data.name,
      slug,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await categories.findOne({ _id });
    return NextResponse.json(categoryDTO(doc!), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
