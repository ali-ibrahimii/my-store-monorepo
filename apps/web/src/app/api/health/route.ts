import { isSupabaseConfigured, pingDatabase, supabaseAnonKey, supabaseServiceKey, supabaseUrl } from "@/lib/supabase";
import { isPlaceholderValue } from "@/lib/env-status";
import { SETUP_ISSUE_LABELS, type SetupIssueKind } from "@my-store/shared-utils";

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

  // چه چیزی واقعاً مانع کار است؟ (قبلاً همیشه «اسکیما را اجرا کنید» گفته
  // می‌شد؛ حالا نوع مشکل جدا می‌شود تا کاربر دنبال علت اشتباه نرود.)
  const kind: SetupIssueKind = result.ok
    ? "unknown"
    : missing.length > 0
      ? "env"
      : /does not exist|schema cache|relation .* does not exist|PGRST205|42P01|could not find the table/i.test(
            result.error,
          )
        ? "schema"
        : /invalid api key|apikey|jwt|permission denied|401|403/i.test(result.error)
          ? "denied"
          : "unreachable";

  const hints: Record<SetupIssueKind, string> = {
    env: `این متغیرها در محیط فعلی تنظیم نشده‌اند: ${missing.join(" ، ")} — در ورسل برای Production هم مقدار بدهید و Redeploy کنید. راهنمای کامل: /setup`,
    schema:
      "اسکیما را از supabase/migrations/0001_init.sql در SQL Editor سوپابیس اجرا کنید، بعد 0002_realtime.sql و در آخر pnpm db:seed. راهنمای کامل: /setup",
    denied:
      "کلید محرمانه‌ی سرور (SUPABASE_SECRET_KEY یا SUPABASE_SERVICE_ROLE_KEY) نامعتبر است یا به این پروژه دسترسی ندارد. کلید را از Project Settings → API Keys دوباره بگیرید.",
    unreachable:
      "سرور به سوپابیس نرسید: یا پروژه Paused است، یا آدرس NEXT_PUBLIC_SUPABASE_URL اشتباه است، یا شبکه/فایروال مانع است. در داشبورد سوپابیس وضعیت پروژه را «Active» کنید.",
    unknown: "وضعیت سرور مشخص نشد؛ صفحه‌ی /setup را باز کنید.",
  };

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
          kind,
          label: SETUP_ISSUE_LABELS[kind],
          error: result.error,
          hint: hints[kind],
        },
    setupUrl: "/setup",
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  };

  return Response.json(body, { status: result.ok ? 200 : 503 });
}
