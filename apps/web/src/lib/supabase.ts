import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
}

export function supabaseServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
}

function isPlaceholder(value: string): boolean {
  return (
    !value ||
    value.includes("YOUR_PROJECT") ||
    value.includes("your-anon-key") ||
    value.includes("your-service-role-key") ||
    value === "change-me"
  );
}

export function isSupabaseConfigured(): boolean {
  return (
    !isPlaceholder(supabaseUrl()) &&
    !isPlaceholder(supabaseAnonKey()) &&
    !isPlaceholder(supabaseServiceKey())
  );
}

export function missingSupabaseMessage(): string {
  return (
    "اتصال سوپابیس کامل نیست. در apps/web/.env.local مقدار واقعی " +
    "NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY و SUPABASE_SERVICE_ROLE_KEY را بگذارید، " +
    "بعد اسکیما را از supabase/migrations/0001_init.sql در SQL Editor اجرا کنید."
  );
}

type AdminGlobal = { __supabaseAdmin?: SupabaseClient };

const g = globalThis as unknown as AdminGlobal;

/** کلاینت service role — فقط روی سرور. RLS را دور می‌زند؛ احراز هویت را خودمان چک می‌کنیم. */
export function getAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(missingSupabaseMessage());
  }
  if (!g.__supabaseAdmin) {
    g.__supabaseAdmin = createClient(supabaseUrl(), supabaseServiceKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return g.__supabaseAdmin;
}

export function createAnonClient(): SupabaseClient {
  if (!supabaseUrl() || !supabaseAnonKey()) {
    throw new Error(missingSupabaseMessage());
  }
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type CookieToSet = { name: string; value: string; options: CookieOptions };

/** کلاینت نشست کوکی برای Route Handler و Server Component. */
export async function createSupabaseServer() {
  if (!supabaseUrl() || !supabaseAnonKey()) {
    throw new Error(missingSupabaseMessage());
  }
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // در Server Component کوکی ست نمی‌شود؛ proxy نشست را تازه می‌کند.
        }
      },
    },
  });
}

export function dbErrorMessage(error: { message?: string } | null | undefined, fallback = "خطای دیتابیس"): string {
  const message = error?.message?.trim();
  if (!message) return fallback;
  return message.replace(/^.*ERROR:\s*/i, "").replace(/^P0001:\s*/, "");
}

export function assertData<T>(result: { data: T; error: { message: string } | null }, fallback?: string): T {
  if (result.error) {
    throw new Error(dbErrorMessage(result.error, fallback));
  }
  return result.data;
}

export async function pingDatabase(
  timeoutMs = 4000,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: missingSupabaseMessage() };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const probe = getAdmin().from("stores").select("id", { head: true, count: "exact" });
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("پاسخی از سوپابیس نیامد")), timeoutMs);
    });
    const result = await Promise.race([probe, timeout]);
    if (result.error) return { ok: false, error: dbErrorMessage(result.error) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: (error as Error)?.message ?? String(error) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
