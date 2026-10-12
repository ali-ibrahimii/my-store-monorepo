// ============================================================
// POST /api/auth/mobile/login — ورود اپ موبایل
//
//   ورودی:  { email, password }
//   خروجی:  { token, user, expiresAt }   → توکن Bearer
//
// تفاوتش با ورود وب (`/api/auth/callback/credentials`):
//   - کوکی ست نمی‌کند؛ توکن را در JSON برمی‌گرداند
//     (React Native کوکی ندارد و باید خودش توکن را نگه دارد)
//   - کد خطای دقیق برمی‌گرداند تا اپ پیام درست نشان دهد:
//       400 ورودی ناقص · 401 ایمیل/رمز اشتباه · 503 دیتابیس خاموش
// ============================================================

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { collections, idOf } from "@/lib/db";
import { jsonError } from "@/lib/api-helpers";
import { createMobileToken } from "@/lib/mobile-token";
import { isDatabaseConnectionError } from "@/lib/auth-errors";
import type { MobileSession, Role } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  email: z.string().min(3, "ایمیل را وارد کنید"),
  password: z.string().min(1, "رمز عبور را وارد کنید"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      // پیام خام zod انگلیسی است؛ برای کاربر فارسی‌اش می‌کنیم
      const missing = parsed.error.issues.map((issue) => String(issue.path[0] ?? ""));
      const fields: string[] = [];
      if (missing.includes("email")) fields.push("ایمیل");
      if (missing.includes("password")) fields.push("رمز عبور");
      return jsonError(400, fields.length ? `${fields.join(" و ")} را وارد کنید` : "ورودی نامعتبر است");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const password = parsed.data.password;

    let user;
    try {
      const { users } = await collections();
      user = await users.findOne({ email });
    } catch (error) {
      // خطای دیتابیس ≠ رمز اشتباه — وگرنه کاربر دنبال رمز می‌گردد
      console.error("[mobile-auth] db error:", (error as Error)?.message ?? error);
      if (isDatabaseConnectionError(error)) {
        return jsonError(
          503,
          "دیتابیس در دسترس نیست. وب‌اپ را با `pnpm dev` اجرا کنید تا دیتابیس توسعه هم بالا بیاید.",
        );
      }
      return jsonError(500, "خطای سرور هنگام ورود");
    }

    if (!user?.passwordHash) {
      return jsonError(401, "ایمیل یا رمز عبور اشتباه است");
    }

    let passwordOk = false;
    try {
      passwordOk = await bcrypt.compare(password, user.passwordHash);
    } catch (error) {
      console.error("[mobile-auth] password check failed:", (error as Error)?.message ?? error);
      return jsonError(500, "خطای سرور هنگام ورود");
    }
    if (!passwordOk) {
      return jsonError(401, "ایمیل یا رمز عبور اشتباه است");
    }

    const sessionUser = {
      id: idOf(user._id),
      email: user.email,
      name: user.name,
      role: user.role as Role,
      storeId: idOf(user.storeId),
    };

    const { token, expiresAt } = await createMobileToken(sessionUser);
    const result: MobileSession = { token, user: sessionUser, expiresAt };
    return NextResponse.json(result);
  } catch (error) {
    console.error("[mobile-auth] unexpected error:", error);
    return jsonError(500, "خطای غیرمنتظره در سرور");
  }
}
