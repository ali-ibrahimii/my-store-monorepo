import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getCachedSession, setCachedSession, sessionKeyFromCookies } from "@/lib/session-cache";

const PROTECTED = [
  "/dashboard",
  "/products",
  "/scan",
  "/accounting",
  "/customers",
  "/barcodes",
  "/settings",
  "/staff",
  "/purchases",
  "/inventory",
];

const ADMIN_ONLY = [
  "/settings",
  "/staff",
  "/purchases",
  "/inventory",
  "/barcodes",
  "/accounting/expenses",
  "/accounting/reports",
  "/accounting/ledger",
];

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
    ...(allowAny ? {} : { Vary: "Origin" }),
  };
}

function isPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    const cors = corsHeadersFor(origin);
    const token = request.nextUrl.searchParams.get("mstore_token");
    const requestHeaders = new Headers(request.headers);
    if (token) requestHeaders.set("x-mystore-token", token);

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: cors ?? {} });
    }
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    if (cors) {
      for (const [key, value] of Object.entries(cors)) response.headers.set(key, value);
    }
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const needsAuth = PROTECTED.some((prefix) => isPrefix(pathname, prefix));
  if (!url || !anon) {
    if (needsAuth) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // ------------------------------------------------------------------
  // احراز هویت با کم‌ترین رفت‌وبرگشت ممکن:
  //   getClaims() امضای JWT را محلی تأیید می‌کند (کلید نامتقارن) و فقط
  //   وقتی نشست باید تازه شود به getUser() برمی‌گردیم.
  // اینجا فقط «دروازه‌ی سریع» است؛ اجازه‌ی نهایی در layout و API انجام می‌شود.
  // ------------------------------------------------------------------
  const authApi = supabase.auth as unknown as {
    getClaims?: () => Promise<{
      data: { claims?: Record<string, unknown> } | null;
      error: unknown;
    }>;
  };

  // اگر همین نشست چند لحظه پیش تأیید شده، دوباره به سرور Auth نمی‌زنیم
  const cacheKey = sessionKeyFromCookies(request.cookies.getAll());
  const cachedSession = getCachedSession(cacheKey);

  let userId: string | null = cachedSession?.userId ?? null;
  let role =
    (cachedSession?.claims.app_metadata as { role?: string } | undefined)?.role ??
    (cachedSession?.claims.role as string | undefined) ??
    "";

  if (typeof authApi.getClaims === "function" && !userId) {
    try {
      const { data, error } = await authApi.getClaims();
      if (!error && typeof data?.claims?.sub === "string") {
        userId = data.claims.sub as string;
        const metadata = data.claims.app_metadata as { role?: string } | undefined;
        role = metadata?.role ?? (data.claims.role as string | undefined) ?? "";
        setCachedSession(cacheKey, { userId, claims: data?.claims ?? {} });
      }
    } catch {
      userId = null;
    }
  }

  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
    role = (data.user?.app_metadata?.role as string | undefined) ?? "";
    if (userId) {
      setCachedSession(cacheKey, {
        userId,
        claims: { sub: userId, ...(data.user?.app_metadata ?? {}) },
      });
    }
  }

  const user = userId ? { id: userId } : null;

  if (needsAuth && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("callbackUrl", pathname);
    const redirect = NextResponse.redirect(login);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  if (user && role === "CASHIER" && ADMIN_ONLY.some((prefix) => isPrefix(pathname, prefix))) {
    const dash = request.nextUrl.clone();
    dash.pathname = "/dashboard";
    const redirect = NextResponse.redirect(dash);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/products",
    "/products/:path*",
    "/scan",
    "/scan/:path*",
    "/accounting",
    "/accounting/:path*",
    "/customers",
    "/customers/:path*",
    "/barcodes",
    "/barcodes/:path*",
    "/settings",
    "/settings/:path*",
    "/staff",
    "/staff/:path*",
    "/purchases",
    "/purchases/:path*",
    "/inventory",
    "/inventory/:path*",
  ],
};
