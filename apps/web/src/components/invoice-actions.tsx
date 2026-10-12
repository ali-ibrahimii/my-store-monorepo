"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@my-store/ui-kit";
import { addInvoicePayment, updateInvoiceStatus } from "@my-store/api-client";
import { PAYMENT_METHOD_LABELS } from "@my-store/shared-utils";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@my-store/shared-types";

interface InvoiceActionsProps {
  invoice: Invoice;
}

const NEXT_STATUSES: { status: InvoiceStatus; label: string }[] = [
  { status: "ISSUED", label: "صادر شود" },
  { status: "PAID", label: "پرداخت‌شده" },
  { status: "CANCELLED", label: "لغو فاکتور" },
];

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const canPay = remaining > 0 && invoice.status !== "CANCELLED" && invoice.status !== "DRAFT";

  async function onPay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const form = new FormData(event.currentTarget);
      await addInvoicePayment(invoice.id, {
        method: String(form.get("method") ?? "CASH") as PaymentMethod,
        amount: Number(form.get("amount") ?? 0),
        note: String(form.get("note") ?? "") || undefined,
      });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت پرداخت");
    } finally {
      setBusy(false);
    }
  }

  async function onStatus(status: InvoiceStatus) {
    setError(null);
    setBusy(true);
    try {
      await updateInvoiceStatus(invoice.id, status);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {canPay ? (
        <form onSubmit={onPay} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">مبلغ پرداخت (تومان)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={1}
                max={remaining}
                step="1"
                defaultValue={remaining}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">روش پرداخت</Label>
              <select
                id="method"
                name="method"
                className="border-input bg-background flex h-9 w-full rounded-md border px-2 text-sm"
                defaultValue="CASH"
              >
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">توضیح (اختیاری)</Label>
            <Input id="note" name="note" placeholder="مثلاً کارتخوان سامان" />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            ثبت پرداخت
          </Button>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {NEXT_STATUSES.filter((s) => s.status !== invoice.status).map((s) => (
          <Button
            key={s.status}
            type="button"
            variant={s.status === "CANCELLED" ? "destructive" : "outline"}
            size="sm"
            disabled={busy || invoice.status === "CANCELLED"}
            onClick={() => onStatus(s.status)}
          >
            {s.label}
          </Button>
        ))}
      </div>

      {error ? (
        <p className="bg-destructive/10 text-destructive rounded-md p-2 text-sm">{error}</p>
      ) : null}
    </div>
  );
}
