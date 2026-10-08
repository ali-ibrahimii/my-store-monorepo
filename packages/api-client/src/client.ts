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
}

function resolveBaseUrl(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, "");
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
  const { method = "GET", body, query, signal, baseUrl } = options;

  const url = new URL(path, resolveBaseUrl(baseUrl) || "http://localhost");
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url.toString(), {
    method,
    signal,
    credentials: "same-origin",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

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
