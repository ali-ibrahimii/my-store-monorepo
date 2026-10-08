"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button, Input, Label } from "@my-store/ui-kit";
import { apiPost } from "@my-store/api-client";
import { API_ROUTES } from "@my-store/shared-utils";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="storeName">نام فروشگاه *</Label>
        <Input id="storeName" name="storeName" required placeholder="فروشگاه من" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">نام شما *</Label>
        <Input id="name" name="name" required placeholder="نام و نام خانوادگی" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">ایمیل *</Label>
        <Input id="email" name="email" type="email" required dir="ltr" placeholder="you@example.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">رمز عبور *</Label>
        <Input id="password" name="password" type="password" required minLength={6} dir="ltr" />
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت فروشگاه"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        قبلاً ثبت‌نام کرده‌اید؟{" "}
        <Link href="/login" className="text-primary underline">
          ورود
        </Link>
      </p>
    </form>
  );
}
