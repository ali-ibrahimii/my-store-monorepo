import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@my-store/shared-utils";
import { handleRouteError } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/**
 * Register a new store + owner user (multi-tenant ready).
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

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "این ایمیل قبلاً ثبت شده است" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const slug =
      storeName
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40) || `store-${Date.now()}`;

    const store = await prisma.store.create({
      data: {
        name: storeName,
        slug,
        users: {
          create: {
            name,
            email,
            passwordHash,
            role: "OWNER",
          },
        },
      },
      include: { users: true },
    });

    return NextResponse.json(
      {
        ok: true,
        storeId: store.id,
        user: { id: store.users[0].id, email: store.users[0].email },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
