"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@my-store/ui-kit";
import { createExpense } from "@my-store/api-client";
import { toInputDate } from "@my-store/shared-utils";
import type { ExpenseCategory } from "@my-store/shared-types";

interface ExpenseFormProps {
  categories: ExpenseCategory[];
}

export function ExpenseForm({ categories }: ExpenseFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        categoryId: String(form.get("categoryId") ?? "") || undefined,
      });
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت هزینه");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">عنوان هزینه *</Label>
          <Input id="title" name="title" required placeholder="مثلاً قبض برق" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="amount">مبلغ (تومان) *</Label>
          <Input id="amount" name="amount" type="number" min={1} required dir="ltr" placeholder="0" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">تاریخ</Label>
          <Input id="date" name="date" type="date" dir="ltr" defaultValue={toInputDate()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">دسته‌بندی</Label>
          <select
            id="categoryId"
            name="categoryId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">— بدون دسته —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="note">یادداشت</Label>
          <Input id="note" name="note" placeholder="اختیاری" />
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت هزینه"}
      </Button>
    </form>
  );
}
