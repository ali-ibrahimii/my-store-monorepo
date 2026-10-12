// ============================================================
// لایه‌ی اتصال اپ موبایل به API
//
// همه‌ی تابع‌های تایپ‌دار از `@my-store/api-client` می‌آیند (همان‌هایی که
// وب‌اپ استفاده می‌کند). تنها تفاوت: اینجا یک‌بار آدرس سرور و تابع
// گرفتن توکن را تنظیم می‌کنیم، چون React Native کوکی نشست ندارد.
//
// آدرس سرور:
//   - در حالت وب: خالی = همان origin (پروکسی dev، /api را به وب‌اپ می‌برد)
//   - روی گوشی: EXPO_PUBLIC_API_URL (مثلاً http://192.168.1.10:3000)
// ============================================================

import { ApiError, apiGet, apiPost, configureApiClient } from "@my-store/api-client";
import { API_ROUTES } from "@my-store/shared-utils";
import type {
  LoginInput,
  MobileSession,
  RegisterInput,
  Role,
  SessionUser,
} from "@my-store/shared-types";

/** آدرس سرور API — در وب خالی است تا همان origin استفاده شود. */
export const API_BASE_URL: string = process.env.EXPO_PUBLIC_API_URL?.trim() ?? "";

export interface HealthStatus {
  ok: boolean;
  db?: string;
  database?: { reachable: boolean; error?: string; hint?: string };
  latencyMs?: number;
  time?: string;
  error?: string;
}

let apiInitialized = false;

/** باید یک‌بار (قبل از اولین درخواست) با تابع خواندن توکن صدا زده شود. */
export function initApiClient(getToken: () => string | null): void {
  if (apiInitialized) return;
  configureApiClient({ baseUrl: API_BASE_URL, getToken });
  apiInitialized = true;
}

/** آدرس کامل سرور — فقط برای نمایش در صفحه‌ی پروفایل. */
export function describeApiBase(): string {
  return API_BASE_URL || "همان آدرس اپ (پروکسی /api)";
}

// ------------------------------------------------------------
// احراز هویت
// ------------------------------------------------------------

/** ورود با ایمیل و رمز → توکن Bearer */
export function login(input: LoginInput): Promise<MobileSession> {
  return apiPost<MobileSession>(API_ROUTES.mobileLogin, input);
}

/** اعتبارسنجی توکن ذخیره‌شده موقع باز شدن اپ */
export function fetchSession(): Promise<{ user: SessionUser }> {
  return apiGet<{ user: SessionUser }>(API_ROUTES.mobileSession);
}

/** ثبت فروشگاه جدید (بعدش باید login صدا زده شود) */
export function register(input: RegisterInput): Promise<{ ok: true; storeId: string }> {
  return apiPost<{ ok: true; storeId: string }>(API_ROUTES.register, input);
}

/** سلامت سرور و دیتابیس — بدون نیاز به ورود */
export function fetchHealth(): Promise<HealthStatus> {
  return apiGet<HealthStatus>(API_ROUTES.health);
}

// ------------------------------------------------------------
// پیام خطا
// ------------------------------------------------------------

/** پیام فارسی و قابل‌فهم برای هر خطای API (برای نمایش به کاربر). */
export function describeApiError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return error.message || "لطفاً وارد حساب کاربری شوید";
    if (error.status === 403) return error.message || "شما اجازه‌ی انجام این کار را ندارید";
    if (error.status === 503) {
      return (
        error.message ||
        "دیتابیس در دسترس نیست. وب‌اپ را با «pnpm dev» اجرا کنید تا دیتابیس توسعه هم بالا بیاید."
      );
    }
    return error.message || `خطای سرور (${error.status})`;
  }

  if (error instanceof Error) {
    const message = error.message ?? "";
    // پیام خام fetch وقتی اصلاً به سرور نرسیم (React Native: Network request failed،
    // مرورگر: Failed to fetch)
    if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
      return (
        `ارتباط با سرور برقرار نشد (${describeApiBase()}). ` +
        "مطمئن شوید وب‌اپ با «pnpm dev» بالا است و آدرس API درست تنظیم شده."
      );
    }
    return message || "خطای ناشناخته";
  }

  return "خطای ناشناخته";
}

/** خطای ۴۰۱ است؟ (برای بیرون انداختن کاربر وقتی توکن باطل شده) */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export { ApiError };
export type { MobileSession, Role, SessionUser };
