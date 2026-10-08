import NextAuth from "next-auth";
import authConfig from "@/auth.config";

/**
 * Next.js 16 "Proxy" (formerly middleware).
 * Keep this on the JWT-only config so it does not load the Prisma adapter;
 * database-backed auth is initialized in lib/auth.ts for server routes.
 */
export const { auth: proxy } = NextAuth(authConfig);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/products/:path*",
    "/scan/:path*",
    "/accounting/:path*",
    "/customers/:path*",
  ],
};
