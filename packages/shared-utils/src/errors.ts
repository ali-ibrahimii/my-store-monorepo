// ============================================================
// تشخیص نوع «سرور آماده نیست» از پاسخ /api/health
//
// قبلاً هر خطای ۵۰۳ با یک متن ثابت نمایش داده می‌شد: «اسکیما را اجرا
// کنید…» — حتی وقتی مشکل واقعاً چیز دیگری بود (پروژه Paused، کلید غلط،
// محیط Production تنظیم‌نشده، یا صرفاً کندی شبکه). نتیجه: کاربر دنبال
// مشکل اشتباه می‌رفت و لاگین را «خراب» می‌دید.
//
// این تابع فقط یک برچسب و پیام کوتاه برمی‌گرداند (مشترک بین وب و اسکنر).
// ============================================================

export type SetupIssueKind =
  /** متغیرهای محیطی ناقص‌اند */
  | "env"
  /** اسکیمای دیتابیس اجرا نشده (جدول‌ها نیستند) */
  | "schema"
  /** سرور/دیتابیس از داخل شبکه در دسترس نیست (Paused، خطای شبکه، تایم‌اوت) */
  | "unreachable"
  /** دسترسی رد شد (کلید نامعتبر / RLS) */
  | "denied"
  /** بقیه‌ی خطاها */
  | "unknown";

export const SETUP_ISSUE_LABELS: Record<SetupIssueKind, string> = {
  env: "تنظیمات سرور ناقص است",
  schema: "دیتابیس آماده نشده",
  unreachable: "سرور دیتابیس در دسترس نیست",
  denied: "دسترسی به دیتابیس رد شد",
  unknown: "سرور آماده نیست",
};

export interface HealthLike {
  ok?: boolean;
  configured?: boolean;
  missingEnv?: string[];
  database?: { reachable?: boolean; error?: string; hint?: string; kind?: string };
}

const UNREACHABLE_PATTERNS =
  /fetch failed|failed to fetch|network|timeout|timed out|تایم|پاسخی از سوپابیس|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|getaddrinfo|socket|ETIMEDOUT|UND_ERR/i;

const DENIED_PATTERNS = /invalid api key|jwt|permission denied|unauthorized|401|403|apikey/i;

const SCHEMA_PATTERNS =
  /does not exist|schema cache|relation .* does not exist|could not find the table|undefined_table|PGRST205|42P01/i;

/** برچسب نوع مشکل از پاسخ سلامت. */
export function classifySetupIssue(body: HealthLike | null | undefined): SetupIssueKind {
  if (!body) return "unreachable";
  if (body.database?.kind === "schema" || body.database?.kind === "unreachable" || body.database?.kind === "denied" || body.database?.kind === "env") {
    return body.database.kind as SetupIssueKind;
  }
  const missing = body.missingEnv ?? [];
  if (missing.length > 0 || body.configured === false) return "env";
  const message = `${body.database?.error ?? ""} ${body.database?.hint ?? ""}`;
  if (SCHEMA_PATTERNS.test(message)) return "schema";
  if (DENIED_PATTERNS.test(message)) return "denied";
  if (UNREACHABLE_PATTERNS.test(message)) return "unreachable";
  return "unknown";
}

/** آیا این «سرور آماده نیست» یعنی اسکیما باید اجرا شود؟ */
export function setupIssueNeedsSchema(kind: SetupIssueKind): boolean {
  return kind === "schema";
}
