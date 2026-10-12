import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { auth, userFromAccessToken } from "@/lib/auth";
import { isSupabaseConfigured, missingSupabaseMessage } from "@/lib/supabase";
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

function parseBearerToken(header: string | null): string | null {
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * کاربر جاری فروشگاه.
 * وب با کوکی نشست سوپابیس می‌آید؛ اپ اسکنر با Bearer token
 * (یا کوکی/هدر x-mystore-token وقتی پروکسی Authorization را حذف کند).
 */
export async function requireStoreUser(minRole?: Role) {
  if (!isSupabaseConfigured()) {
    return {
      user: null,
      response: jsonError(503, missingSupabaseMessage()),
    } as const;
  }

  let user: SessionUser | null = null;
  const session = await auth();
  if (session?.user) {
    user = session.user;
  } else {
    const headerList = await headers().catch(() => null);
    const cookieToken =
      (await cookies().catch(() => null))?.get(MOBILE_TOKEN_COOKIE)?.value ?? null;
    const token =
      parseBearerToken(headerList?.get("authorization") ?? null) ??
      (headerList?.get("x-mystore-token")?.trim() || null) ??
      cookieToken;
    if (token) {
      user = await userFromAccessToken(token);
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

export function forbidCashier(user: SessionUser, message = "این کار فقط برای مدیر است") {
  if (user.role !== "ADMIN") {
    return jsonError(403, message);
  }
  return null;
}
