// ============================================================
// راز امضای نشست (Auth.js / NextAuth) — یک نقطه‌ی مشترک
//
// ⚠️ چرا این فایل لازم شد؟
// قبلاً `lib/auth.ts` یک AUTH_SECRET پیش‌فرضِ توسعه داشت، ولی
// `proxy.ts` (لبه‌ی Next.js 16، قبلاً middleware) راز نداشت. نتیجه:
//   ورود موفق می‌شد و کوکی نشست ست می‌شد، اما Proxy نمی‌توانست JWT را
//   بخواند → هر صفحه‌ی محافظت‌شده به /login برمی‌گشت و کاربر فکر
//   می‌کرد «ورود کار نمی‌کند».
//
// حالا هر دو از همین تابع استفاده می‌کنند تا رازشان یکی باشد.
// ============================================================

/** فقط برای محیط توسعه — در production باید AUTH_SECRET تنظیم شود. */
const DEV_FALLBACK_SECRET = "my-store-dev-secret-change-me-in-production";

export function resolveAuthSecret(): string | undefined {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== "production") {
    // در dev یک راز ثابت لازم است؛ وگرنه هر بار restart، نشست‌ها باطل می‌شوند.
    return DEV_FALLBACK_SECRET;
  }
  // در production، NextAuth خودش خطای MissingSecret می‌دهد (امن‌تر از حدس‌زدن).
  return undefined;
}

/** آیا راز از env آمده یا fallback توسعه است؟ (برای لاگ/هشدار) */
export function usingDevFallbackSecret(): boolean {
  return !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET;
}
