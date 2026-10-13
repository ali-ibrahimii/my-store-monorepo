/**
 * کش کوتاه‌مدتِ «نشست تأییدشده».
 *
 * چرا لازم است؟ بررسی هویت با کوکی، برای پروژه‌های سوپابیس با کلید
 * متقارن (HS256) یک درخواست به سرور Auth می‌فرستد. صفحه‌ها، ناوبری‌ها و
 * پولینگ ۳ ثانیه‌ای همراه فاکتورها همان را تکرار می‌کردند و سایت کند می‌شد.
 *
 * اینجا نتیجه‌ی تأییدشده ۱۵ ثانیه نگه داشته می‌شود (کلید = محتوای کوکی
 * نشست)؛ پس در عمل رفت‌وبرگشت احراز هویت حذف می‌شود، ولی خروج/تغییر کاربر
 * بلافاصله اثر می‌کند چون کوکی عوض می‌شود و کلید کش هم عوض می‌شود.
 */

export const SESSION_CACHE_TTL_MS = 15_000;
const SESSION_CACHE_MAX = 200;

export interface CachedSession {
  userId: string;
  claims: Record<string, unknown>;
}

interface Entry extends CachedSession {
  expiresAt: number;
}

const store = new Map<string, Entry>();

/** کلید کش از کوکی‌های نشست سوپابیس (شامل بخش‌های چانک‌شده). */
export function sessionKeyFromCookies(
  cookies: { name: string; value: string }[],
): string | null {
  const relevant = cookies
    .filter((cookie) => /(^|-)auth-token(\.\d+)?$/.test(cookie.name))
    .map((cookie) => `${cookie.name}=${cookie.value}`);
  if (relevant.length === 0) return null;
  return relevant.sort().join("|");
}

export function getCachedSession(key: string | null): CachedSession | null {
  if (!key) return null;
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return { userId: entry.userId, claims: entry.claims };
}

export function setCachedSession(key: string | null, session: CachedSession): void {
  if (!key) return;
  if (store.size >= SESSION_CACHE_MAX) {
    const oldest = store.keys().next().value;
    if (oldest) store.delete(oldest);
  }
  store.set(key, { ...session, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
}

export function invalidateCachedSession(key: string | null): void {
  if (key) store.delete(key);
}

/** پس از تغییر نقش/غیرفعال‌کردن کاربر: نشست‌های کش‌شده‌ی او را دور بریز. */
export function invalidateSessionsForUser(userId: string): void {
  for (const [key, entry] of store) {
    if (entry.userId === userId) store.delete(key);
  }
}

export function clearSessionCache(): void {
  store.clear();
}
