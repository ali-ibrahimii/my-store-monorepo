import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { collections } from "@/lib/db";
import { registerSchema, slugify } from "@my-store/shared-utils";
import { handleRouteError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * ثبت یک فروشگاه جدید + کاربر مالک (multi-tenant).
 * POST /api/auth/register { storeName, name, email, password }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const { storeName, name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const { stores, users } = await collections();

    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const baseSlug = slugify(storeName, "store");

    // slug باید یکتا باشد؛ در صورت تکرار یک پسوند عددی اضافه می‌کنیم
    let slug = baseSlug;
    for (let i = 2; await stores.findOne({ slug }); i++) {
      slug = `${baseSlug}-${i}`;
    }

    const now = new Date();
    const storeId = new ObjectId();
    const userId = new ObjectId();

    await stores.insertOne({
      _id: storeId,
      name: storeName,
      slug,
      currency: "IRR",
      createdAt: now,
      updatedAt: now,
    });

    await users.insertOne({
      _id: userId,
      name,
      email: normalizedEmail,
      emailVerified: null,
      passwordHash,
      role: "OWNER",
      storeId: storeId.toHexString(),
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json(
      {
        ok: true,
        storeId: storeId.toHexString(),
        user: { id: userId.toHexString(), email: normalizedEmail },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
