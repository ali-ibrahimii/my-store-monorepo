"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ReceiptText } from "lucide-react";
import { toast } from "sonner";

import { createExpense } from "@my-store/api-client";
import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-store/ui-kit/components/select";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { toInputDate } from "@my-store/shared-utils";
import type { ExpenseCategory } from "@my-store/shared-types";

interface ExpenseFormProps {
  categories: ExpenseCategory[];
  onCreated?: () => void;
}

export function ExpenseForm({ categories, onCreated }: ExpenseFormProps) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      await createExpense({
        title: String(form.get("title") ?? ""),
        amount: Number(form.get("amount") ?? 0),
        date: String(form.get("date") ?? "") || undefined,
        note: String(form.get("note") ?? "") || undefined,
        categoryId: categoryId || undefined,
      });
      formRef.current?.reset();
      setCategoryId("");
      toast.success("هزینه ثبت شد");
      onCreated?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت هزینه");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="title">عنوان هزینه *</FieldLabel>
          <Input id="title" name="title" required placeholder="مثلاً قبض برق" />
        </Field>
        <Field>
          <FieldLabel htmlFor="amount">مبلغ (تومان) *</FieldLabel>
          <Input id="amount" name="amount" type="number" min={1} required dir="ltr" placeholder="0" />
        </Field>
        <Field>
          <FieldLabel htmlFor="date">تاریخ</FieldLabel>
          <Input id="date" name="date" type="date" dir="ltr" defaultValue={toInputDate()} />
        </Field>
        <Field>
          <FieldLabel htmlFor="category">دسته‌بندی</FieldLabel>
          <Select
            value={categoryId || "NONE"}
            onValueChange={(value) => setCategoryId(value === "NONE" ? "" : value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="بدون دسته" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">— بدون دسته —</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="note">یادداشت</FieldLabel>
          <Input id="note" name="note" placeholder="اختیاری" />
        </Field>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? <Spinner /> : <ReceiptText className="size-4" />}
        {busy ? "در حال ثبت…" : "ثبت هزینه"}
      </Button>
    </form>
  );
}
