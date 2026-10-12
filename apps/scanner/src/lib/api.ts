// ============================================================
// لایه‌ی API اپ اسکنر
//
// این اپ «جدا» از وب‌اپ deploy می‌شود (مثلاً scan.vercel.app در برابر
// app.vercel.app)؛ بنابراین آدرس API را از VITE_API_URL می‌گیرد.
// در توسعه همان origin است (پروکسی vite → :3000) تا CORS لازم نباشد.
//
// احراز هویت با توکن Bearer است (نه کوکی) — همان توکن موبایل که از
// POST /api/auth/mobile/login گرفته می‌شود و در localStorage می‌ماند.
// ============================================================

import { configureApiClient } from "@my-store/api-client";
import type { MobileSession } from "@my-store/shared-types";

const API_BASE_URL: string = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const STORAGE_KEY = "my-store.scanner.session.v1";

let session: MobileSession | null = readSession();

configureApiClient({
  baseUrl: API_BASE_URL,
  getToken: () => session?.token ?? null,
});

function readSession(): MobileSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MobileSession;
    if (!parsed?.token || !parsed?.user) return null;
    if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getSession(): MobileSession | null {
  return session;
}

export function saveSession(next: MobileSession): void {
  session = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function clearSession(): void {
  session = null;
  localStorage.removeItem(STORAGE_KEY);
}

/** آدرس API که اپ به آن وصل است (برای نمایش در صفحه‌ی ورود) */
export function apiBaseUrlLabel(): string {
  return API_BASE_URL || "همان دامنه (پروکسی توسعه)";
}
