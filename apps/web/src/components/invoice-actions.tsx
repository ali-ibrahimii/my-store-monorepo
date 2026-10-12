"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Ban, CheckCircle2, CreditCard } from "lucide-react";
import { toast } from "sonner";

import { addInvoicePayment, updateInvoiceStatus } from "@my-store/api-client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@my-store/ui-kit/components/alert-dialog";
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
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { PAYMENT_METHOD_LABELS } from "@my-store/shared-utils";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@my-store/shared-types";

interface InvoiceActionsProps {
  invoice: Invoice;
}

const NEXT_STATUSES: { status: InvoiceStatus; label: string }[] = [
  { status: "ISSUED", label: "صدور فاکتور" },
  { status: "PAID", label: "ثبت به‌عنوان پرداخت‌شده" },
];

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const canPay =
    remaining > 0 && invoice.status !== "CANCELLED" && invoice.status !== "DRAFT";

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
      toast.success("پرداخت ثبت شد");
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
      toast.success("وضعیت فاکتور به‌روز شد");
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
        <form onSubmit={onPay} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="amount">مبلغ پرداخت (تومان)</FieldLabel>
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
            </Field>
            <Field>
              <FieldLabel htmlFor="method">روش پرداخت</FieldLabel>
              <Select name="method" defaultValue="CASH">
                <SelectTrigger id="method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="note">توضیح (اختیاری)</FieldLabel>
              <Input id="note" name="note" placeholder="مثلاً کارتخوان سامان" />
            </Field>
          </FieldGroup>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? <Spinner /> : <CreditCard className="size-4" />}
            ثبت پرداخت
          </Button>
        </form>
      ) : null}

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        {NEXT_STATUSES.filter((item) => item.status !== invoice.status).map(
          (item) => (
            <Button
              key={item.status}
              type="button"
              variant="outline"
              size="sm"
              disabled={busy || invoice.status === "CANCELLED"}
              onClick={() => onStatus(item.status)}
            >
              <CheckCircle2 className="size-4" />
              {item.label}
            </Button>
          ),
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={busy || invoice.status === "CANCELLED"}
            >
              <Ban className="size-4" />
              لغو فاکتور
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>لغو فاکتور {invoice.number}؟</AlertDialogTitle>
              <AlertDialogDescription>
                با لغو فاکتور، موجودی انبار و اسناد حساب‌داری برمی‌گردند. این کار
                قابل بازگشت نیست.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction onClick={() => onStatus("CANCELLED")}>
                لغو فاکتور
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
