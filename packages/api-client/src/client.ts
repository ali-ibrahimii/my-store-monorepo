// ============================================================
// Base HTTP client — typed fetch wrapper shared by web & mobile
// ============================================================

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Extra query params */
  query?: Record<string, string | number | boolean | undefined>;
  /** Abort signal */
  signal?: AbortSignal;
  /** Base URL — defaults to same-origin (browser) or NEXT_PUBLIC_APP_URL */
  baseUrl?: string;
  /** Extra headers for this single request */
  headers?: Record<string, string>;
  /** Cookie policy — defaults to same-origin (omit when a bearer token is set) */
  credentials?: "omit" | "same-origin" | "include";
}

// ------------------------------------------------------------
// Global client configuration
//
// مرورگر (وب‌اپ) نیازی به تنظیم ندارد: همان origin و کوکی نشست.
// اپ موبایل کوکی ندارد، بنابراین یک توکن Bearer می‌فرستد و آدرس سرور
// را هم خودش مشخص می‌کند. به‌جای اینکه هر تابع یک آرگومان اضافه بگیرد،
// یک‌بار در شروع اپ `configureApiClient()` صدا زده می‌شود.
// ------------------------------------------------------------

export interface ApiClientConfig {
  /** Base URL prepended to every path. Empty string = same origin. */
  baseUrl?: string;
  /** Called on every request; returns the bearer token when signed in. */
  getToken?: () => string | null | undefined;
  /** Headers added to every request. */
  headers?: Record<string, string>;
  /** Cookie policy; defaults to same-origin (omit when a token is set). */
  credentials?: RequestOptions["credentials"];
}

let clientConfig: ApiClientConfig = {};

export function configureApiClient(config: ApiClientConfig): void {
  clientConfig = { ...clientConfig, ...config };
}

export function getApiClientConfig(): ApiClientConfig {
  return clientConfig;
}

/** فقط برای تست — پیکربندی سراسری را برمی‌گرداند به حالت اولیه. */
export function resetApiClient(): void {
  clientConfig = {};
}

function resolveBaseUrl(explicit?: string): string {
  if (explicit !== undefined) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") return "";
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, signal } = options;
  const baseUrl = resolveBaseUrl(options.baseUrl ?? clientConfig.baseUrl);
  const token = clientConfig.getToken?.() ?? null;

  // برای ساختن query string یک base موقت لازم است، ولی اگر base واقعاً
  // خالی باشد (حالت مرورگر / پیش‌نمایش) باید همان آدرس relative را
  // fetch کنیم تا درخواست هم‌ریشه بماند — وگرنه `new URL(..., "http://localhost")`
  // آدرس مطلق localhost می‌سازد و مرورگر به جای سرور، به کامپیوتر خود
  // کاربر درخواست می‌فرستد («Failed to fetch»).
  const url = new URL(path, baseUrl || "http://localhost");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  const finalUrl = baseUrl ? url.toString() : url.pathname + url.search;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(clientConfig.headers ?? {}),
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const response = await fetch(finalUrl, {
    method,
    signal,
    credentials: options.credentials ?? clientConfig.credentials ?? "same-origin",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // [debug موقت] برای تشخیص اینکه مرورگر کدام باندل را اجرا می‌کند و
  // آیا هدر Authorization واقعاً فرستاده شده — بعد از عیب‌یابی حذف شود.
  (globalThis as { __MYSTORE_DEBUG__?: unknown }).__MYSTORE_DEBUG__ = {
    bundle: "v3-module-token",
    last: { method, url: finalUrl, hadAuth: Boolean(token), status: response.status },
  };

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : undefined) ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  return data as T;
}

export const apiGet = <T>(path: string, query?: RequestOptions["query"], baseUrl?: string) =>
  apiRequest<T>(path, { method: "GET", query, baseUrl });

export const apiPost = <T>(path: string, body?: unknown, baseUrl?: string) =>
  apiRequest<T>(path, { method: "POST", body, baseUrl });

export const apiPatch = <T>(path: string, body?: unknown, baseUrl?: string) =>
  apiRequest<T>(path, { method: "PATCH", body, baseUrl });

export const apiDelete = <T>(path: string, baseUrl?: string) =>
  apiRequest<T>(path, { method: "DELETE", baseUrl });
