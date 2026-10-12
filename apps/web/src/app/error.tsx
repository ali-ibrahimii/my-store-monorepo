"use client";

// ============================================================
// مرز خطای سراسری — به‌جای صفحه‌ی سفید/«Application error»
//
// پرتکرارترین خطای محیط توسعه: MongoDB اجرا نشده است.
// پس همان‌جا راهنمای درست را نشان می‌دهیم.
// ============================================================

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  const message = error?.message ?? "";
  const looksLikeDb =
    /Mongo|ECONNREFUSED|ENOTFOUND|server selection|topology/i.test(message) ||
    /connect/i.test(message);

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-xl font-bold">خطا در اجرای این صفحه</h1>

        {looksLikeDb ? (
          <div className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm">
            <p className="font-semibold text-destructive">به احتمال زیاد دیتابیس در دسترس نیست.</p>
            <ul className="text-muted-foreground list-inside list-disc space-y-1">
              <li>
                ساده‌ترین راه: در ترمینال <code dir="ltr">pnpm dev</code> را اجرا کنید — دیتابیس
                توسعه را خودش بالا می‌آورد.
              </li>
              <li>
                یا جداگانه: <code dir="ltr">pnpm db:sandbox</code> (بدون Docker) ·{" "}
                <code dir="ltr">pnpm docker:up</code> (MongoDB واقعی)
              </li>
              <li>
                وضعیت دیتابیس: <code dir="ltr">/api/health</code>
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            جزئیات خطا در ترمینال سرور و کنسول مرورگر ثبت شده است.
          </p>
        )}

        <pre className="bg-muted max-h-40 overflow-auto rounded-md p-3 text-xs" dir="ltr">
          {message || "Unknown error"}
        </pre>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium"
          >
            تلاش دوباره
          </button>
          <a
            href="/api/health"
            className="rounded-md border px-4 py-2 text-sm font-medium"
            target="_blank"
            rel="noreferrer"
          >
            بررسی سلامت دیتابیس
          </a>
        </div>

        {error?.digest ? (
          <p className="text-muted-foreground text-xs" dir="ltr">
            digest: {error.digest}
          </p>
        ) : null}
      </div>
    </main>
  );
}
