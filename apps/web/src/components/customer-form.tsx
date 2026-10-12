"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createCustomer } from "@my-store/api-client";
import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";

export function CustomerForm() {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

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
      formRef.current?.reset();
      toast.success("مشتری ثبت شد");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت مشتری");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">نام مشتری *</FieldLabel>
          <Input id="name" name="name" required placeholder="نام و نام خانوادگی" />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">تلفن</FieldLabel>
          <Input id="phone" name="phone" dir="ltr" placeholder="0912xxxxxxx" />
        </Field>
        <Field>
          <FieldLabel htmlFor="address">آدرس</FieldLabel>
          <Input id="address" name="address" placeholder="اختیاری" />
        </Field>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? <Spinner /> : <UserPlus className="size-4" />}
        {busy ? "در حال ثبت…" : "ثبت مشتری"}
      </Button>
    </form>
  );
}
