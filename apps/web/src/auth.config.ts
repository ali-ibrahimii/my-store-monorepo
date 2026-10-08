import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config (no Prisma / bcrypt here — those live in lib/auth.ts).
 * The `authorized` callback runs in proxy.ts (Next.js 16 "Proxy", formerly
 * middleware) and decides which pages require a session.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      const isProtectedPage = ["/dashboard", "/products", "/scan", "/accounting", "/customers"].some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      );

      if (isProtectedPage) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [], // configured in lib/auth.ts (needs Prisma + bcrypt)
} satisfies NextAuthConfig;

export default authConfig;
