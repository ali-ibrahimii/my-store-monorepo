// ============================================================
// خطاهای احراز هویت — با «کد» مشخص
//
// Auth.js کد خطا را در URL برمی‌گرداند
// (‎/login?error=CredentialsSignin&code=db_unavailable‎) و کلاینت
// `signIn(..., { redirect: false })` هم همان `code` را می‌دهد.
// پس می‌توانیم پیام درست را به کاربر نشان دهیم، به‌جای اینکه همه‌ی
// خطاها «ایمیل یا رمز عبور اشتباه است» دیده شوند.
// ============================================================

import { CredentialsSignin } from "next-auth";

/**
 * دیتابیس در دسترس نیست (سرور MongoDB بالا نیست / آدرس اشتباه است).
 * شایع‌ترین دلیلِ «ورود کار نمی‌کند» در محیط توسعه.
 */
export class DatabaseUnavailableError extends CredentialsSignin {
  code = "db_unavailable";
}

/** خطای غیرمنتظره‌ی سرور هنگام ورود (مثلاً رمز هش‌شده‌ی خراب). */
export class AuthServerError extends CredentialsSignin {
  code = "server_error";
}

/** خطای اتصال به MongoDB است؟ (برای انتخاب پیام مناسب) */
export function isDatabaseConnectionError(error: unknown): boolean {
  const name = (error as { name?: string })?.name ?? "";
  if (name.startsWith("Mongo")) return true;
  const code = (error as { code?: string })?.code ?? "";
  return ["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "EHOSTUNREACH", "EAI_AGAIN"].includes(code);
}
