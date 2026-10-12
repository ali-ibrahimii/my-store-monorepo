// ============================================================
// توکن ورود اپ موبایل (Bearer token)
//
// چرا؟ وب‌اپ از کوکی نشستِ Auth.js استفاده می‌کند و `auth()` همان را
// می‌خواند. ولی React Native کوکی ذخیره نمی‌کند و EventSource/fetch آن
// هم کوکی را خودکار نمی‌فرستد. پس برای موبایل یک توکن جدا می‌سازیم که
// در هدر `Authorization: Bearer <token>` می‌آید.
//
// نکته‌ی امنیتی: رمزنگاری/امضا با همان کتابخانه‌ی Auth.js و همان
// `AUTH_SECRET` انجام می‌شود، ولی «نمک» (salt) متفاوت است تا توکن
// موبایل با کوکی نشست وب قابل جابه‌جایی نباشد.
// ============================================================

import { decode, encode } from "next-auth/jwt";
import { resolveAuthSecret } from "@/lib/auth-secret";
import type { Role, SessionUser } from "@my-store/shared-types";

/** نمک اختصاصی توکن موبایل (نام کوکی نشست وب نیست). */
const MOBILE_TOKEN_SALT = "mystore.mobile-token";

/** ۳۰ روز — اپ موبایل نباید هر روز دوباره ورود بخواهد. */
export const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 24 * 30;

function requireSecret(): string {
  const secret = resolveAuthSecret();
  if (!secret) {
    // بدون راز نمی‌شود توکن ساخت؛ در production باید AUTH_SECRET تنظیم شود.
    throw new Error("AUTH_SECRET تنظیم نشده است");
  }
  return secret;
}

/** ساخت توکن ورود برای یک کاربر (همان فیلدهایی که نشست وب دارد). */
export async function createMobileToken(
  user: SessionUser,
): Promise<{ token: string; expiresAt: string }> {
  const token = await encode({
    token: {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      storeId: user.storeId,
    },
    secret: requireSecret(),
    salt: MOBILE_TOKEN_SALT,
    maxAge: MOBILE_TOKEN_MAX_AGE,
  });

  return {
    token,
    expiresAt: new Date(Date.now() + MOBILE_TOKEN_MAX_AGE * 1000).toISOString(),
  };
}

/**
 * خواندن توکن موبایل → کاربر نشست.
 * هر خطایی (منقضی، دست‌کاری‌شده، راز اشتباه) یعنی «بدون نشست»: `null`.
 */
export async function readMobileToken(token: string): Promise<SessionUser | null> {
  try {
    const payload = await decode({ token, secret: requireSecret(), salt: MOBILE_TOKEN_SALT });
    const id = typeof payload?.sub === "string" ? payload.sub : "";
    const storeId = typeof payload?.storeId === "string" ? payload.storeId : "";
    if (!id || !storeId) return null;

    return {
      id,
      storeId,
      email: typeof payload?.email === "string" ? payload.email : "",
      name: typeof payload?.name === "string" ? payload.name : null,
      role: (typeof payload?.role === "string" ? payload.role : "CASHIER") as Role,
    };
  } catch {
    return null;
  }
}

/** بیرون‌کشیدن توکن از مقدار هدر `Authorization`. */
export function parseBearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(.+)$/i.exec((header ?? "").trim());
  const token = match?.[1]?.trim();
  return token ? token : null;
}

/** بیرون‌کشیدن توکن از هدر `Authorization: Bearer <token>` یک درخواست. */
export function bearerTokenFrom(request: Request): string | null {
  return parseBearerToken(request.headers.get("authorization"));
}
