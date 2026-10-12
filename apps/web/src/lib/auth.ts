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
import { resolveAuthSecret } from "@/lib/auth-secret";
import {
  AuthServerError,
  DatabaseUnavailableError,
  isDatabaseConnectionError,
} from "@/lib/auth-errors";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  // همان رازی که proxy.ts استفاده می‌کند (وگرنه نشست در Proxy خوانده نمی‌شود)
  secret: resolveAuthSecret(),
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

        let user;
        try {
          const { users } = await collections();
          user = await users.findOne({ email });
        } catch (error) {
          // ⚠️ خطای دیتابیس ≠ رمز اشتباه؛ کد جداگانه برمی‌گردانیم تا
          // صفحه‌ی ورود پیام درست («دیتابیس در دسترس نیست») نشان دهد.
          console.error("[auth] db error:", (error as Error)?.message ?? error);
          throw isDatabaseConnectionError(error) ? new DatabaseUnavailableError() : new AuthServerError();
        }

        if (!user?.passwordHash) return null;

        try {
          const ok = await bcrypt.compare(password, user.passwordHash);
          if (!ok) return null;
        } catch (error) {
          console.error("[auth] password check failed:", (error as Error)?.message ?? error);
          throw new AuthServerError();
        }

        return {
          id: idOf(user._id),
          email: user.email,
          name: user.name,
          role: user.role,
          storeId: idOf(user.storeId),
        };
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
