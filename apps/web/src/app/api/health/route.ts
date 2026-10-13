import { isSupabaseConfigured, pingDatabase, supabaseAnonKey, supabaseServiceKey, supabaseUrl } from "@/lib/supabase";
import { isPlaceholderValue } from "@/lib/env-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/health — سلامت سرور و دیتابیس (بدون نیاز به ورود).
 * برای عیب‌یابی سریع روی ورسل: /api/health  و صفحه‌ی کامل: /setup
 */
export async function GET() {
  const started = Date.now();
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  const secret = supabaseServiceKey();

  const missing: string[] = [];
  if (isPlaceholderValue(url)) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (isPlaceholderValue(anon)) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (isPlaceholderValue(secret)) missing.push("SUPABASE_SECRET_KEY");

  const result = await pingDatabase();
  const host = url.replace(/^https?:\/\//, "").split(".")[0] || null;

  const body = {
    ok: result.ok,
    app: "my-store",
    db: "supabase",
    project: host,
    configured: isSupabaseConfigured(),
    missingEnv: missing,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    database: result.ok
      ? { reachable: true }
      : {
          reachable: false,
          error: result.error,
          hint:
            missing.length > 0
              ? `این متغیرها در محیط فعلی تنظیم نشده‌اند: ${missing.join(" ، ")} — در ورسل برای Production هم مقدار بدهید و Redeploy کنید. راهنمای کامل: /setup`
              : "اسکیما را از supabase/migrations/0001_init.sql در SQL Editor سوپابیس اجرا کنید، بعد 0002_realtime.sql و در آخر pnpm db:seed. راهنمای کامل: /setup",
        },
    setupUrl: "/setup",
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  };

  return Response.json(body, { status: result.ok ? 200 : 503 });
}
