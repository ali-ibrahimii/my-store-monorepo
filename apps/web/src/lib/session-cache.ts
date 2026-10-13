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

/**
 * کش «توکن تأییدشده» (مسیر اپ اسکنر).
 *
 * اپ گوشی با Bearer token می‌آید و هر اسکن/جست‌وجو/ثبت فاکتور یعنی یک
 * رفت‌وبرگشت به سرور Auth. اینجا نتیجه‌ی تأییدشده ۳۰ ثانیه نگه داشته
 * می‌شود تا اسکن‌های پشت‌سرهم سریع باشند. کلید کش، هش توکن است (خود
 * توکن ذخیره نمی‌شود).
 */
export const TOKEN_CACHE_TTL_MS = 30_000;
const TOKEN_CACHE_MAX = 500;

const tokenStore = new Map<string, { userId: string; expiresAt: number }>();

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getCachedTokenUser(hash: string): string | null {
  const entry = tokenStore.get(hash);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    tokenStore.delete(hash);
    return null;
  }
  return entry.userId;
}

export function setCachedTokenUser(hash: string, userId: string): void {
  if (tokenStore.size >= TOKEN_CACHE_MAX) {
    const oldest = tokenStore.keys().next().value;
    if (oldest) tokenStore.delete(oldest);
  }
  tokenStore.set(hash, { userId, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS });
}

export function invalidateCachedToken(hash: string): void {
  tokenStore.delete(hash);
}

/** پس از تغییر نقش/غیرفعال‌کردن کاربر: نشست‌ها و توکن‌های کش‌شده‌ی او را دور بریز. */
export function invalidateSessionsForUser(userId: string): void {
  for (const [key, entry] of store) {
    if (entry.userId === userId) store.delete(key);
  }
  for (const [hash, entry] of tokenStore) {
    if (entry.userId === userId) tokenStore.delete(hash);
  }
}

export function clearSessionCache(): void {
  store.clear();
  tokenStore.clear();
}
