import type { Metadata } from "next";
import Link from "next/link";

import { SetupStatusPanel } from "@/components/setup-status-panel";

export const metadata: Metadata = {
  title: "راه‌اندازی و عیب‌یابی",
};

/** صفحه‌ی عیب‌یابی — بدون نیاز به ورود. */
export default function SetupPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-5 pb-safe">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">راه‌اندازی و عیب‌یابی</h1>
        <p className="text-muted-foreground text-sm">
          این صفحه نشان می‌دهد کدام بخش راه‌اندازی مانده است: کلیدهای سوپابیس،
          اجرای اسکیمای دیتابیس، ریل‌تایم و حساب مدیر.
        </p>
      </header>

      <SetupStatusPanel />

      <footer className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>بعد از درست‌کردن هر مورد، همین صفحه را رفرش کنید.</span>
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          رفتن به صفحه‌ی ورود
        </Link>
      </footer>
    </main>
  );
}
