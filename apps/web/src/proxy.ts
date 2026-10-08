import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Next.js 16 "Proxy" (formerly middleware).
 * Keep this on the JWT-only config so it does not load the Prisma adapter;
 * database-backed auth is initialized in lib/auth.ts for server routes.
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
