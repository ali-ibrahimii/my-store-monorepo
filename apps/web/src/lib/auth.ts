// ============================================================
// Auth.js (next-auth v5) — ورود با ایمیل و رمز عبور
//
// استراتژی session = JWT، یعنی هیچ جدول/کالکشن session ای لازم نیست
// و به همین دلیل adapter دیتابیس هم لازم نیست.
// تنها کاری که با MongoDB انجام می‌دهیم: پیدا کردن کاربر و
// مقایسه‌ی رمز با bcrypt است.
// ============================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import authConfig from "@/auth.config";
import { collections, idOf } from "@/lib/db";

/** فقط برای توسعه — در production حتماً باید AUTH_SECRET تنظیم شود. */
const DEV_FALLBACK_SECRET = "my-store-dev-secret-change-me-in-production";

function resolveSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") return DEV_FALLBACK_SECRET;
  return undefined;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: resolveSecret(),
  // اپلیکیشن پشت پروکسی/دامنه‌های مختلف (مثل پیش‌نمایش) هم باید کار کند
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "ایمیل", type: "email" },
        password: { label: "رمز عبور", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "")
          .toLowerCase()
          .trim();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          const { users } = await collections();
          const user = await users.findOne({ email });
          if (!user?.passwordHash) return null;

          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;

          return {
            id: idOf(user._id),
            email: user.email,
            name: user.name,
            role: user.role,
            storeId: idOf(user.storeId),
          };
        } catch (error) {
          console.error("[auth] authorize failed:", (error as Error)?.message ?? error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        const u = user as { role?: unknown; storeId?: unknown };
        token.role = typeof u.role === "string" ? u.role : "CASHIER";
        token.storeId = typeof u.storeId === "string" ? u.storeId : "";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? "");
        session.user.role = typeof token.role === "string" ? token.role : "CASHIER";
        session.user.storeId = typeof token.storeId === "string" ? token.storeId : "";
      }
      return session;
    },
  },
});
