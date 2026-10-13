import { NextResponse } from "next/server";

import {
  getAdmin,
  isSupabaseConfigured,
  pingDatabase,
  supabaseAnonKey,
  supabaseServiceKey,
  supabaseUrl,
} from "@/lib/supabase";
import { isPlaceholderValue } from "@/lib/env-status";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface DiagnosticsResult {
  missingTables?: string[];
  realtimeTables?: string[];
  adminCount?: number;
}

function mask(value: string): string {
  if (!value) return "";
  if (value.length <= 12) return "•••";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

/**
 * GET /api/setup/status — «چرا کار نمی‌کند؟»
 *
 * بدون نیاز به ورود. وضعیت متغیرهای محیطی، دسترسی دیتابیس، اجراشدن
 * اسکیما (جدول‌ها)، فعال‌بودن ریل‌تایم و وجود حساب مدیر را برمی‌گرداند.
 * صفحه‌ی /setup همین را نشان می‌دهد.
 */
export async function GET() {
  const url = supabaseUrl();
  const anon = supabaseAnonKey();
  const secret = supabaseServiceKey();

  const envRows = [
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "آدرس پروژه سوپابیس",
      present: Boolean(url) && !isPlaceholderValue(url),
      preview: url ? url.replace(/^https?:\/\//, "") : "",
      required: true,
      legacyKey: null as string | null,
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      label: "کلید publishable (مرورگر/ورود)",
      present: Boolean(anon) && !isPlaceholderValue(anon),
      preview: mask(anon),
      required: true,
      legacyKey: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    },
    {
      key: "SUPABASE_SECRET_KEY",
      label: "کلید محرمانه‌ی سرور (فقط سرور)",
      present: Boolean(secret) && !isPlaceholderValue(secret),
      preview: mask(secret),
      required: true,
      legacyKey: "SUPABASE_SERVICE_ROLE_KEY",
    },
    {
      key: "NEXT_PUBLIC_APP_URL",
      label: "آدرس عمومی وب‌اپ",
      present: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
      preview: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "",
      required: false,
      legacyKey: null,
    },
    {
      key: "CORS_ORIGINS",
      label: "دامنه‌های مجاز اسکنر (با کاما جدا کنید)",
      present: Boolean(process.env.CORS_ORIGINS?.trim()),
      preview: process.env.CORS_ORIGINS?.trim() ?? "*",
      required: false,
      legacyKey: null,
    },
  ];

  const missingEnv = envRows.filter((row) => row.required && !row.present).map((row) => row.key);

  const ping = isSupabaseConfigured() ? await pingDatabase(6000) : { ok: false as const, error: "کلیدها کامل نیستند" };

  let diagnostics: DiagnosticsResult | null = null;
  let diagnosticsError: string | null = null;
  if (ping.ok) {
    const result = await getAdmin().rpc("setup_diagnostics");
    if (result.error) {
      diagnosticsError = result.error.message;
    } else {
      diagnostics = (result.data ?? null) as DiagnosticsResult | null;
    }
  }

  const missingTables = diagnostics?.missingTables ?? [];
  const realtimeTables = diagnostics?.realtimeTables ?? [];
  const schemaRan = ping.ok && missingTables.length === 0;
  const realtimeReady = realtimeTables.includes("invoices") && realtimeTables.includes("scan_events");

  const steps = [
    {
      id: "env",
      title: "متغیرهای محیطی سوپابیس",
      ok: missingEnv.length === 0,
      detail:
        missingEnv.length === 0
          ? "کلیدهای لازم برای اتصال به سوپابیس تنظیم شده‌اند."
          : `این متغیرها تنظیم نشده‌اند: ${missingEnv.join(" ، ")}`,
      fix: "در ورسل: Project → Settings → Environment Variables. حتماً برای محیط Production هم مقدار بدهید و بعد Redeploy کنید.",
    },
    {
      id: "database",
      title: "اتصال به دیتابیس سوپابیس",
      ok: ping.ok,
      detail: ping.ok
        ? "اتصال برقرار است و جدول‌ها پاسخ می‌دهند."
        : (ping.error ?? "پاسخی از سوپابیس نیامد"),
      fix: "آدرس پروژه و کلید محرمانه را بررسی کنید؛ پروژه سوپابیس نباید Paused باشد.",
    },
    {
      id: "schema",
      title: "اجرای اسکیمای دیتابیس (0001_init.sql)",
      ok: schemaRan,
      detail: schemaRan
        ? "همه‌ی جدول‌های لازم ساخته شده‌اند."
        : missingTables.length > 0
          ? `این جدول‌ها ساخته نشده‌اند: ${missingTables.slice(0, 6).join(", ")}${missingTables.length > 6 ? " …" : ""}`
          : (diagnosticsError ?? "وضعیت اسکیما خوانده نشد"),
      fix: "در سوپابیس → SQL Editor کل فایل supabase/migrations/0001_init.sql را اجرا کنید.",
    },
    {
      id: "realtime",
      title: "ریل‌تایم (0002_realtime.sql)",
      ok: realtimeReady,
      detail: realtimeReady
        ? "جدول‌های فاکتور و اسکن روی کانال ریل‌تایم هستند؛ فاکتور گوشی همان لحظه در وب می‌آید."
        : "ریل‌تایم فعال نیست — همگام‌سازی با پولینگ (هر ۳ ثانیه) انجام می‌شود.",
      fix: "در SQL Editor فایل supabase/migrations/0002_realtime.sql را اجرا کنید.",
    },
    {
      id: "admin",
      title: "حساب مدیر",
      ok: (diagnostics?.adminCount ?? 0) > 0,
      detail:
        (diagnostics?.adminCount ?? 0) > 0
          ? `${diagnostics?.adminCount} حساب مدیر فعال وجود دارد.`
          : "هیچ حساب مدیری پیدا نشد؛ ورود به پنل ممکن نیست.",
      fix: "محلی `pnpm db:seed` را بزنید، یا از صفحه‌ی /register یک حساب مدیر بسازید.",
    },
  ];

  return NextResponse.json(
    {
      ok: steps.every((step) => step.ok),
      env: envRows,
      steps,
      database: ping,
      adminCount: diagnostics?.adminCount ?? 0,
      realtimeReady,
      runtime: {
        node: process.version,
        vercel: Boolean(process.env.VERCEL),
        vercelEnv: process.env.VERCEL_ENV ?? null,
        region: process.env.VERCEL_REGION ?? null,
      },
      time: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
