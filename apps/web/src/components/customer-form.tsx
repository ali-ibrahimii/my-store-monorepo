"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@my-store/ui-kit";
import { createCustomer } from "@my-store/api-client";

export function CustomerForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      await createCustomer({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        address: String(form.get("address") ?? "") || undefined,
      });
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت مشتری");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">نام مشتری *</Label>
        <Input id="name" name="name" required placeholder="نام و نام خانوادگی" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">تلفن</Label>
        <Input id="phone" name="phone" dir="ltr" placeholder="0912xxxxxxx" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">آدرس</Label>
        <Input id="address" name="address" placeholder="اختیاری" />
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت مشتری"}
      </Button>
    </form>
  );
}
