import type { Role, SessionUser } from "@my-store/shared-types";
import { redirect } from "next/navigation";

import { cookies } from "next/headers";

import {
  getCachedSession,
  getCachedTokenUser,
  hashToken,
  invalidateCachedToken,
  sessionKeyFromCookies,
  setCachedSession,
  setCachedTokenUser,
} from "@/lib/session-cache";
import { assertData, createSupabaseServer, getAdmin, isSupabaseConfigured } from "@/lib/supabase";

interface StoreNameJoin {
  name: string;
}

interface ProfileRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  store_id: string;
  active: boolean;
  /** نام فروشگاه در همان کوئری پروفایل می‌آید (یک رفت‌وبرگشت کمتر) */
  stores?: StoreNameJoin | StoreNameJoin[] | null;
}

/**
 * کش کوتاه‌مدتِ پروفایل.
 *
 * قبلاً هر بار رفتن به یک صفحه‌ی جدید، دوباره:
 *   middleware → getUser()   (رفت‌وبرگشت به سرور سوپابیس)
 *   layout     → getUser()   (رفت‌وبرگشت دیگر)
 *   layout     → profiles    (رفت‌وبرگشت دیگر)
 * انجام می‌شد؛ روی اینترنت واقعی همین چند مرحله «چند ثانیه» طول می‌کشید.
 *
 * حالا هویت با تأییدِ امضای JWT روی همان سرور (getClaims) چک می‌شود و
 * پروفایل ۲۰ ثانیه در حافظه می‌ماند. پس پیمایش بین صفحه‌ها معمولاً
 * فقط یک رفت‌وبرگشت (داده‌ی خود صفحه) دارد.
 */
const PROFILE_TTL_MS = 20_000;
const PROFILE_CACHE_MAX = 300;

const profileCache = new Map<string, { user: SessionUser; expiresAt: number }>();

function readStoreName(row: ProfileRow): string | null {
  const joined = row.stores;
  if (!joined) return null;
  const value = Array.isArray(joined) ? joined[0] : joined;
  return value?.name ?? null;
}

export function toSessionUser(row: ProfileRow): SessionUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    storeId: row.store_id,
    storeName: readStoreName(row),
  };
}

/** پروفایل کاربر (با کش کوتاه‌مدت). */
export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const cached = profileCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.user;

  const result = await getAdmin()
    .from("profiles")
    .select("id, name, email, role, store_id, active, stores(name)")
    .eq("id", userId)
    .maybeSingle();
  const row = assertData(result) as ProfileRow | null;

  if (!row?.active) {
    profileCache.delete(userId);
    return null;
  }

  const user = toSessionUser(row);
  if (profileCache.size >= PROFILE_CACHE_MAX) {
    const oldest = profileCache.keys().next().value;
    if (oldest) profileCache.delete(oldest);
  }
  profileCache.set(userId, { user, expiresAt: Date.now() + PROFILE_TTL_MS });
  return user;
}

/** پس از تغییر نقش/نام کاربر، کش را دور بریزید. */
export function invalidateSessionUser(userId: string): void {
  profileCache.delete(userId);
}

/**
 * کاربر از توکن Bearer (اپ اسکنر).
 *
 * هر اسکن = یک درخواست؛ اگر هر بار توکن را از سرور Auth بپرسیم، فروش
 * با گوشی کند می‌شود. پس نتیجه‌ی تأییدشده ۳۰ ثانیه کش می‌شود.
 */
export async function userFromAccessToken(token: string): Promise<SessionUser | null> {
  const hash = await hashToken(token);
  const cachedUserId = getCachedTokenUser(hash);
  if (cachedUserId) return loadSessionUser(cachedUserId);

  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) {
    invalidateCachedToken(hash);
    return null;
  }
  setCachedTokenUser(hash, data.user.id);
  return loadSessionUser(data.user.id);
}

/**
 * شناسه و claimهای کاربر از کوکی نشست.
 * اول با getClaims (تأیید امضای JWT؛ برای پروژه‌های با کلید نامتقارن
 * بدون رفت‌وبرگشت شبکه) و در صورت شکست با getUser.
 */
export interface SessionClaims {
  userId: string;
  claims: Record<string, unknown>;
}

export async function sessionClaimsFromCookie(): Promise<SessionClaims | null> {
  const cookieStore = await cookies();
  const cacheKey = sessionKeyFromCookies(cookieStore.getAll());
  const cached = getCachedSession(cacheKey);
  if (cached) return { userId: cached.userId, claims: cached.claims };

  const supabase = await createSupabaseServer();

  const authApi = supabase.auth as unknown as {
    getClaims?: () => Promise<{
      data: { claims?: Record<string, unknown> } | null;
      error: unknown;
    }>;
  };

  if (typeof authApi.getClaims === "function") {
    try {
      const { data, error } = await authApi.getClaims();
      const sub = data?.claims?.sub;
      if (!error && typeof sub === "string" && sub) {
        const claims = data?.claims ?? {};
        setCachedSession(cacheKey, { userId: sub, claims });
        return { userId: sub, claims };
      }
    } catch {
      // ادامه با getUser
    }
  }

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const claims = { sub: data.user.id, ...(data.user.app_metadata ?? {}) };
  setCachedSession(cacheKey, { userId: data.user.id, claims });
  return { userId: data.user.id, claims };
}

/** کاربر جاری از کوکی نشست سوپابیس. خروجی با صفحه‌های قبلی سازگار است. */
export async function auth(): Promise<{ user: SessionUser } | null> {
  if (!isSupabaseConfigured()) return null;
  const session = await sessionClaimsFromCookie();
  if (!session) return null;
  const user = await loadSessionUser(session.userId);
  if (!user) return null;
  return { user };
}

export async function requirePageUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
