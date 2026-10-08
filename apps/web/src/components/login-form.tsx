"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button, Input, Label } from "@my-store/ui-kit";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "CredentialsSignin"
      ? "ایمیل یا رمز عبور اشتباه است"
      : null,
  );
  const [busy, setBusy] = useState(false);

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
      setError("ایمیل یا رمز عبور اشتباه است");
      return;
    }
    router.push("/dashboard");
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
