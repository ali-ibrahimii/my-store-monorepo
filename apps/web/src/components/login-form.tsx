"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, AlertTriangle, LogIn } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@my-store/ui-kit/components/alert";
import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import { Field, FieldGroup, FieldLabel } from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [dbWarning, setDbWarning] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/health", { cache: "no-store" })
      .then((res) => res.json().then((body) => ({ ok: res.ok, body })))
      .then(({ ok, body }) => {
        if (cancelled || ok) return;
        setDbWarning(body?.database?.hint || body?.database?.error || "سوپابیس در دسترس نیست");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setError(body?.error || "ورود ناموفق بود");
        return;
      }
      const callbackUrl = searchParams.get("callbackUrl");
      const safeTarget =
        callbackUrl && callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard";
      router.push(safeTarget);
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد");
    } finally {
      setBusy(false);
    }
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
            placeholder="admin@mystore.ir"
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
          <AlertTitle>سوپابیس وصل نیست</AlertTitle>
          <AlertDescription>{dbWarning}</AlertDescription>
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
        فروشگاه ندارید؟{" "}
        <Link href="/register" className="text-primary underline-offset-4 hover:underline">
          ساخت حساب مدیر
        </Link>
      </p>

      <div className="bg-muted text-muted-foreground space-y-1 rounded-lg p-3 text-xs">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">مدیر</Badge>
          <span dir="ltr">admin@mystore.ir / 123456</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline">صندوق‌دار</Badge>
          <span dir="ltr">cashier@mystore.ir / 123456</span>
        </div>
        <p className="text-center">بعد از اجرای اسکیما و pnpm db:seed</p>
      </div>
    </form>
  );
}
