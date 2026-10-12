"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button, Input, Label } from "@my-store/ui-kit";

/**
 * پیام مناسب برای هر کد خطای Auth.js.
 * (Auth.js کد را در URL/پاسخ `signIn` برمی‌گرداند: result.code)
 */
function errorMessage(error?: string | null, code?: string | null): string | null {
  if (code === "db_unavailable") {
    return "اتصال به دیتابیس برقرار نیست (سرور MongoDB اجرا نشده). با `pnpm dev` دیتابیس هم خودکار بالا می‌آید.";
  }
  if (code === "server_error") {
    return "خطای غیرمنتظره‌ای در سرور رخ داد. لاگ ترمینال سرور را ببینید.";
  }
  if (error === "Configuration") {
    return "تنظیمات سرور کامل نیست (مثلاً AUTH_SECRET). فایل .env.local را بررسی کنید.";
  }
  if (error === "CredentialsSignin") {
    return "ایمیل یا رمز عبور اشتباه است";
  }
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    errorMessage(searchParams.get("error"), searchParams.get("code")),
  );
  const [busy, setBusy] = useState(false);
  const [dbWarning, setDbWarning] = useState<string | null>(null);

  // اگر دیتابیس در دسترس نباشد، کاربر باید همان اول بفهمد — نه اینکه
  // فکر کند «رمز اشتباه است».
  useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled || ok) return;
        setDbWarning(
          `دیتابیس در دسترس نیست (${body?.db ?? "mongodb"}). ` +
            "ترمینال را ببینید یا `pnpm dev` را دوباره اجرا کنید.",
        );
      })
      .catch(() => {
        /* اگر خود endpoint در دسترس نبود، ساکت می‌مانیم */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    setBusy(false);
    if (result?.error) {
      setError(
        errorMessage(result.error, (result as { code?: string }).code) ??
          "ورود ناموفق بود؛ دوباره تلاش کنید",
      );
      return;
    }
    // احترام به callbackUrl (فقط مسیرهای داخلی مجاز هستند)
    const callbackUrl = searchParams.get("callbackUrl");
    const safeTarget =
      callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
        ? callbackUrl
        : "/dashboard";
    router.push(safeTarget);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="email">ایمیل</Label>
        <Input id="email" name="email" type="email" required dir="ltr" placeholder="owner@mystore.ir" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">رمز عبور</Label>
        <Input id="password" name="password" type="password" required dir="ltr" placeholder="••••••" />
      </div>

      {dbWarning ? (
        <p className="rounded-md bg-amber-500/10 p-2 text-sm text-amber-700 dark:text-amber-400">
          {dbWarning}{" "}
          <a href="/api/health" className="underline" target="_blank" rel="noreferrer">
            جزئیات
          </a>
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "در حال ورود..." : "ورود"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        حساب ندارید؟{" "}
        <Link href="/register" className="text-primary underline">
          ثبت‌نام فروشگاه
        </Link>
      </p>

      <p className="text-muted-foreground rounded-md bg-muted p-2 text-center text-xs">
        demo: owner@mystore.ir / 123456
      </p>
    </form>
  );
}
