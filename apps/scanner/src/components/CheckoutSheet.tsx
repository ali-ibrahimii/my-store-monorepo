import { useState } from "react";
import { AlertCircle, Banknote, CreditCard, HandCoins, Loader2, X } from "lucide-react";

import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import { Separator } from "@my-store/ui-kit/components/separator";
import { createInvoice } from "@my-store/api-client";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";
import type { Invoice, PaymentMethod } from "@my-store/shared-types";
import type { CartLine } from "../lib/cart";
import { beepError, vibrate } from "../lib/feedback";

type PayChoice = "CASH" | "CARD" | "CREDIT";

const PAY_OPTIONS: { value: PayChoice; label: string; hint: string; icon: typeof Banknote }[] = [
  { value: "CASH", label: "نقدی", hint: "کل مبلغ دریافت شد", icon: Banknote },
  { value: "CARD", label: "کارت", hint: "کارت‌خوان", icon: CreditCard },
  { value: "CREDIT", label: "نسیه", hint: "بدون پرداخت الآن", icon: HandCoins },
];

interface CheckoutSheetProps {
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  taxRate: number;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPaid: (invoice: Invoice) => void;
  onError: (message: string) => void;
  onBusyChange: (busy: boolean) => void;
}

/**
 * شیت تأیید فاکتور.
 * اقلام اسکن‌شده یک‌جا به یک فاکتور تبدیل می‌شوند (روش پرداخت هم انتخاب می‌شود).
 */
export function CheckoutSheet({
  lines,
  subtotal,
  tax,
  total,
  taxRate,
  busy,
  error,
  onClose,
  onPaid,
  onError,
  onBusyChange,
}: CheckoutSheetProps) {
  const [method, setMethod] = useState<PayChoice>("CASH");

  async function submit() {
    if (lines.length === 0 || busy) return;
    onBusyChange(true);
    onError("");
    try {
      const invoice = await createInvoice({
        items: lines.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          unitPrice: line.unitPrice,
        })),
        tax,
        discount: 0,
        note: `ثبت از اسکنر گوشی — ${toPersianDigits(lines.length)} ردیف`,
        issueNow: true,
        payment:
          method === "CREDIT"
            ? undefined
            : {
                method: method as PaymentMethod,
                amount: total,
                note: "پرداخت هنگام فروش (اسکنر)",
              },
      });
      onPaid(invoice);
    } catch (cause) {
      beepError();
      vibrate([80, 50, 80]);
      onError(cause instanceof Error ? cause.message : "ثبت فاکتور ناموفق بود");
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        aria-label="بستن"
        className="flex-1"
        onClick={busy ? undefined : onClose}
      />
      <div className="sheet-up bg-background flex max-h-[92vh] flex-col rounded-t-3xl border-t shadow-2xl pb-safe">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-base font-bold">تأیید و ثبت فاکتور</h2>
            <p className="text-muted-foreground text-xs">
              {toPersianDigits(lines.reduce((sum, line) => sum + line.qty, 0))} قلم در این فاکتور
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            onClick={onClose}
            disabled={busy}
            aria-label="بستن"
          >
            <X className="size-5" />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <ul className="divide-y">
            {lines.map((line) => (
              <li key={line.productId} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm">{line.name}</p>
                  <p className="text-muted-foreground tnum text-[11px]">
                    {toPersianDigits(line.qty)} × {formatCurrency(line.unitPrice)}
                  </p>
                </div>
                <span className="tnum text-sm font-medium">
                  {formatCurrency(line.qty * line.unitPrice)}
                </span>
              </li>
            ))}
          </ul>

          <Separator className="my-3" />

          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">جمع کالاها</dt>
              <dd className="tnum">{formatCurrency(subtotal)}</dd>
            </div>
            {taxRate > 0 ? (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">
                  مالیات ({toPersianDigits(taxRate)}٪)
                </dt>
                <dd className="tnum">{formatCurrency(tax)}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between border-t pt-2 text-lg font-bold">
              <dt>مبلغ قابل پرداخت</dt>
              <dd className="tnum">{formatCurrency(total)}</dd>
            </div>
          </dl>

          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">روش پرداخت</p>
            <div className="grid grid-cols-3 gap-2">
              {PAY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const active = method === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setMethod(option.value)}
                    className={
                      "flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-xs transition-colors " +
                      (active
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted")
                    }
                  >
                    <Icon className="size-5" />
                    <span>{option.label}</span>
                    <span className="text-[10px] opacity-70">{option.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="size-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <footer className="border-t p-4">
          <Button
            className="h-14 w-full text-base font-semibold"
            onClick={() => void submit()}
            disabled={busy || lines.length === 0}
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : null}
            {busy ? "در حال ثبت فاکتور…" : "ثبت فاکتور"}
          </Button>
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            فاکتور همین لحظه در پنل وب (بخش فاکتورها) ظاهر می‌شود و از آنجا چاپ می‌شود.
          </p>
        </footer>
      </div>
    </div>
  );
}
