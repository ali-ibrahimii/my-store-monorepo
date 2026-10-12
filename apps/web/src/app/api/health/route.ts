// ============================================================
// GET /api/health — بررسی سلامت سرور و دیتابیس
//
//   200 → { ok: true,  database: { reachable: true, ... } }
//   503 → { ok: false, database: { reachable: false, error } }
//
// چرا؟ شایع‌ترین مشکل توسعه این است که وب‌اپ بالا می‌آید ولی
// MongoDB اجرا نشده و بعد «ورود» کار نمی‌کند. با این endpoint،
// یک درخواست ساده دقیقاً می‌گوید مشکل کجاست.
// ============================================================

import { mongoDbName, mongoUri, pingDatabase } from "@/lib/db";

export const dynamic = "force-dynamic";

/** یوزر/پسورد را از URI حذف می‌کند تا در پاسخ نیفتد. */
function redact(uri: string): string {
  const at = uri.lastIndexOf("@");
  const schemeEnd = uri.indexOf("://");
  if (at === -1 || schemeEnd === -1) return uri;
  return `${uri.slice(0, schemeEnd + 3)}<credentials>@${uri.slice(at + 1)}`;
}

export async function GET() {
  const started = Date.now();
  const result = await pingDatabase();

  const body = {
    ok: result.ok,
    app: "my-store",
    db: mongoDbName(),
    uri: redact(mongoUri()),
    database: result.ok
      ? { reachable: true }
      : {
          reachable: false,
          error: result.error,
          hint:
            "سرور MongoDB اجرا نشده یا آدرس اشتباه است. ساده‌ترین راه: `pnpm dev` " +
            "(دیتابیس توسعه را خودش بالا می‌آورد) یا `pnpm db:sandbox`.",
        },
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  };

  return Response.json(body, { status: result.ok ? 200 : 503 });
}
