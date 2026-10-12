import Link from "next/link";

/**
 * پیام دوستانه وقتی دیتابیس در دسترس نیست (فقط محیط توسعه).
 * به‌جای صفحه‌ی خالی/خطای خام، دقیقاً می‌گوید چه کاری لازم است.
 */
export function DbOfflineNotice({ detail }: { detail?: string }) {
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-bold">دیتابیس در دسترس نیست</h1>
      <p className="text-muted-foreground text-sm">
        وب‌اپ بالا آمده، ولی به MongoDB وصل نمی‌شود؛ به همین دلیل صفحه‌ها و ورود کار نمی‌کنند.
      </p>

      <ul className="list-inside list-disc space-y-1 text-sm">
        <li>
          ساده‌ترین راه: در ریشه‌ی پروژه <code dir="ltr">pnpm dev</code> را اجرا کنید — دیتابیس
          توسعه را خودش بالا می‌آورد.
        </li>
        <li>
          یا جداگانه: <code dir="ltr">pnpm db:sandbox</code> (بدون Docker) ·{" "}
          <code dir="ltr">pnpm docker:up</code> (MongoDB واقعی)
        </li>
        <li>
          بررسی وضعیت: <Link href="/api/health" className="text-primary underline">/api/health</Link>
        </li>
      </ul>

      {detail ? (
        <pre className="bg-muted overflow-auto rounded-md p-3 text-xs" dir="ltr">
          {detail}
        </pre>
      ) : null}
    </div>
  );
}
