import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import { parseBearerToken, readMobileToken } from "@/lib/mobile-token";
import { MOBILE_TOKEN_COOKIE, hasRole } from "@my-store/shared-utils";
import type { Role, SessionUser } from "@my-store/shared-types";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  console.error("[api] route error:", error);
  if (error instanceof Error) {
    return jsonError(400, error.message);
  }
  return jsonError(500, "خطای داخلی سرور");
}

/**
 * Resolve the current session user (with role + storeId).
 * Returns `{ user: null, response }` when unauthenticated/forbidden.
 *
 * دو راه احراز هویت پشتیبانی می‌شود:
 *   ۱) کوکی نشست Auth.js — همان چیزی که وب‌اپ می‌فرستد
 *   ۲) هدر `Authorization: Bearer <token>` — همان چیزی که اپ موبایل
 *      می‌فرستد (React Native کوکی ذخیره نمی‌کند)
 * بقیه‌ی routeها هیچ تغییری لازم ندارند: همه از همین تابع استفاده می‌کنند.
 */
export async function requireStoreUser(minRole?: Role) {
  const session = await auth();
  const raw = session?.user;

  let user: SessionUser | null = null;

  if (raw?.id && raw.storeId) {
    user = {
      id: raw.id,
      email: raw.email ?? "",
      name: raw.name ?? null,
      role: (raw.role as Role) ?? "CASHIER",
      storeId: raw.storeId,
    };
  } else {
    // بدون کوکی نشست → توکن موبایل را از دو جا امتحان می‌کنیم:
    //   ۱) هدر Authorization (native و curl)
    //   ۲) کوکی MOBILE_TOKEN_COOKIE — چون پروکسی پیش‌نمایش هدر را حذف
    //      می‌کند ولی کوکی را عبور می‌دهد
    // (هدر/کوکی از `next/headers` خوانده می‌شود تا هیچ route ای عوض نشود.)
    const headerList = await headers().catch(() => null);
    const cookieToken =
      (await cookies().catch(() => null))?.get(MOBILE_TOKEN_COOKIE)?.value ?? null;
    const token = parseBearerToken(headerList?.get("authorization") ?? null) ?? cookieToken;
    if (token) {
      user = await readMobileToken(token);
      // [debug] توکن رسید ولی نامعتبر/منقضی؟
      if (!user) console.warn("[auth] 401: توکن (هدر/کوکی) رسید ولی نامعتبر/منقضی بود");
    } else {
      // [debug] کلاینت اصلاً توکن نفرستاده؟
      console.warn("[auth] 401: نه کوکی نشست، نه Authorization، نه کوکی موبایل");
    }
  }

  if (!user) {
    return {
      user: null,
      response: jsonError(401, "لطفاً وارد حساب کاربری شوید"),
    } as const;
  }

  if (minRole && !hasRole(user.role, minRole)) {
    return {
      user: null,
      response: jsonError(403, "شما اجازه انجام این کار را ندارید"),
    } as const;
  }

  return { user, response: null } as const;
}
