/**
 * Next.js 16 "Proxy" (formerly middleware).
 * Protects dashboard pages — the decision logic lives in auth.config.ts
 * (`authorized` callback). API routes do their own session checks.
 */
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/scan/:path*",
    "/accounting/:path*",
    "/customers/:path*",
  ],
};
