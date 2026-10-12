import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Next.js 16 "Proxy" (formerly middleware).
 * Runs on the Edge runtime, so it only verifies the JWT via auth.config.ts.
 * MongoDB-backed helpers (roles, store data) live in lib/auth.ts.
 */
const { auth } = NextAuth(authConfig);

// Next.js 16.2.11+ statically validates that proxy.ts exports a function
// (default export or a named `proxy` export); the previous
// `export const { auth: proxy } = NextAuth(...)` destructuring is no longer
// recognized, so re-export explicitly instead.
export { auth as proxy };

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/scan/:path*",
    "/accounting/:path*",
    "/customers/:path*",
  ],
};
