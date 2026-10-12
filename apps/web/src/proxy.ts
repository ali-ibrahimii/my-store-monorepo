import { NextResponse, type NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { resolveAuthSecret } from "@/lib/auth-secret";

/**
 * Next.js 16 "Proxy" (formerly middleware).
 * Runs on the Edge runtime, so it only verifies the JWT via auth.config.ts.
 * MongoDB-backed helpers (roles, store data) live in lib/auth.ts.
 *
 * دو کار می‌کند:
 *   ۱) محافظت از صفحه‌های داشبورد (بدون نشست → /login)
 *   ۲) CORS برای API — اپ اسکنر روی دامنه‌ی جدا deploy می‌شود
 *      (مثلاً scan.vercel.app) و باید بتواند cross-origin به API
 *      درخواست بزند (Bearer token، بدون کوکی).
 *
 * ⚠️ `secret` باید همان رازی باشد که lib/auth.ts با آن JWT را امضا می‌کند.
 */
const { auth } = NextAuth({
  ...authConfig,
  secret: resolveAuthSecret(),
  trustHost: true,
});

// ------------------------------------------------------------
// CORS
// ------------------------------------------------------------
// دامنه‌های مجاز: لیست جدا‌شده با کاما در CORS_ORIGINS.
// اگر ست نشود، همه‌ی originها مجازند (`*`) — برای API با Bearer token
// بی‌خطر است چون کوکی/credentials در کار نیست.
const CORS_ALLOWED_ORIGINS = (process.env.CORS_ORIGINS ?? "*")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter(Boolean);

function corsHeadersFor(origin: string | null): Record<string, string> | null {
  if (!origin) return null;
  const allowAny = CORS_ALLOWED_ORIGINS.includes("*");
  if (!allowAny && !CORS_ALLOWED_ORIGINS.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": allowAny ? "*" : origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-mystore-token",
    "Access-Control-Max-Age": "86400",
    // وقتی origin را echo می‌کنیم، کش مرورگر باید per-origin باشد
    ...(allowAny ? {} : { Vary: "Origin" }),
  };
}

const authProxy = auth as unknown as (req: NextRequest) => Response | Promise<Response | void> | void;

function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const cors = corsHeadersFor(origin);

    // preflight — همان‌جا جواب می‌دهیم، به route نمی‌رسد
    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: cors ?? {} });
    }

    const response = NextResponse.next();
    if (cors) {
      for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    }
    return response;
  }

  return authProxy(request);
}

// Next.js 16.2.11+ statically validates that proxy.ts exports a function
// (default export or a named `proxy` export).
export { proxy };

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/products/:path*",
    "/scan/:path*",
    "/accounting/:path*",
    "/customers/:path*",
  ],
};
