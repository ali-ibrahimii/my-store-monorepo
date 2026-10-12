"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, AlertTriangle, LogIn } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@my-store/ui-kit/components/alert";
import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";

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
  const [error, setError] = React.useState<string | null>(
    errorMessage(searchParams.get("error"), searchParams.get("code")),
  );
  const [busy, setBusy] = React.useState(false);
  const [dbWarning, setDbWarning] = React.useState<string | null>(null);

  // اگر دیتابیس در دسترس نباشد، کاربر باید همان اول بفهمد — نه اینکه
  // فکر کند «رمز اشتباه است».
  React.useEffect(() => {
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
    <form onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">ایمیل</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="username"
            placeholder="owner@mystore.ir"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">رمز عبور</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            dir="ltr"
            autoComplete="current-password"
            placeholder="••••••"
          />
        </Field>
      </FieldGroup>

      {dbWarning ? (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>دیتابیس در دسترس نیست</AlertTitle>
          <AlertDescription>
            {dbWarning}{" "}
            <a
              href="/api/health"
              className="underline"
              target="_blank"
              rel="noreferrer"
            >
              جزئیات
            </a>
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : <LogIn className="size-4" />}
        {busy ? "در حال ورود…" : "ورود"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        حساب ندارید؟{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          ثبت‌نام فروشگاه
        </Link>
      </p>

      <div className="bg-muted text-muted-foreground flex items-center justify-center gap-2 rounded-lg p-2 text-xs">
        <Badge variant="secondary">دمو</Badge>
        <span dir="ltr">owner@mystore.ir / 123456</span>
      </div>
    </form>
  );
}
