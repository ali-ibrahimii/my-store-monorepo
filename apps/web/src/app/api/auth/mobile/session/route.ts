// ============================================================
// GET /api/auth/mobile/session — «این توکن هنوز معتبر است؟»
//
//   هدر:   Authorization: Bearer <token>
//   200 →  { user }
//   401 →  { error: "..." }  (توکن نیست / منقضی شده / دست‌کاری شده)
//
// اپ موبایل این را موقع باز شدن صدا می‌زند تا اگر توکن باطل شده بود،
// کاربر را به صفحه‌ی ورود بفرستد (به‌جای اینکه وسط کار ۴۰۱ بگیرد).
// ============================================================

import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api-helpers";
import { bearerTokenFrom, readMobileToken } from "@/lib/mobile-token";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = bearerTokenFrom(request);
  if (!token) {
    return jsonError(401, "لطفاً وارد حساب کاربری شوید");
  }

  const user = await readMobileToken(token);
  if (!user) {
    return jsonError(401, "نشست شما منقضی شده است؛ دوباره وارد شوید");
  }

  return NextResponse.json({ user });
}
