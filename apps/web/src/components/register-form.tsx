"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Store } from "lucide-react";

import { apiPost } from "@my-store/api-client";
import { API_ROUTES } from "@my-store/shared-utils";
import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      const email = String(form.get("email") ?? "");
      const password = String(form.get("password") ?? "");

      await apiPost(API_ROUTES.register, {
        storeName: String(form.get("storeName") ?? ""),
        name: String(form.get("name") ?? ""),
        email,
        password,
      });

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        router.push("/login");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت‌نام");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="storeName">نام فروشگاه *</FieldLabel>
          <Input id="storeName" name="storeName" required placeholder="فروشگاه من" />
        </Field>
        <Field>
          <FieldLabel htmlFor="name">نام شما *</FieldLabel>
          <Input id="name" name="name" required placeholder="نام و نام خانوادگی" />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">ایمیل *</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            required
            dir="ltr"
            autoComplete="username"
            placeholder="you@example.com"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">رمز عبور *</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            dir="ltr"
            autoComplete="new-password"
          />
          <FieldDescription>حداقل ۶ کاراکتر.</FieldDescription>
        </Field>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Spinner /> : <Store className="size-4" />}
        {busy ? "در حال ثبت…" : "ثبت فروشگاه"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          ورود
        </Link>
      </p>
    </form>
  );
}
