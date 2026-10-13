import { CheckCircle2, ExternalLink, Printer, RotateCcw } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import {
  formatCurrency,
  INVOICE_STATUS_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";
import type { Invoice } from "@my-store/shared-types";
import { webAppUrl, webInvoiceUrl } from "../lib/api";

interface SuccessViewProps {
  invoice: Invoice;
  onNewSale: () => void;
}

/** صفحه‌ی موفقیت پس از ثبت فاکتور. */
export function SuccessView({ invoice, onNewSale }: SuccessViewProps) {
  const printUrl = webInvoiceUrl(invoice.id);
  const panelUrl = webAppUrl("/accounting");

  return (
    <div className="flex min-h-full flex-col justify-center gap-5 p-5 pt-safe pb-safe">
      <div className="pop-in space-y-5 text-center">
        <div className="bg-success/10 text-success mx-auto flex size-20 items-center justify-center rounded-full">
          <CheckCircle2 className="size-11" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-bold">فاکتور ثبت شد</h1>
          <p className="text-muted-foreground text-sm">
            فاکتور در پنل وب هم ثبت شد و آماده‌ی چاپ است.
          </p>
        </div>

        <div className="bg-card rounded-2xl border p-4 text-start shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">شماره فاکتور</span>
            <span className="text-base font-bold" dir="ltr">
              {invoice.number}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">مبلغ</span>
            <span className="tnum text-base font-bold">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">تعداد اقلام</span>
            <span className="tnum text-sm">{toPersianDigits(invoice.items.length)} ردیف</span>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-muted-foreground text-xs">وضعیت</span>
            <span className="text-sm">{INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}</span>
          </div>
        </div>

        {printUrl ? (
          <div className="flex flex-col gap-2">
            <Button
              className="h-13 w-full"
              onClick={() => window.open(printUrl, "_blank", "noopener")}
            >
              <Printer className="size-4" />
              نسخه‌ی چاپ فاکتور
            </Button>
            <p className="text-muted-foreground text-[11px] leading-5">
              برای چاپ روی کاغذ، از لپ‌تاپ بخش «فاکتورها» را باز کنید؛ همان فاکتور با دکمه‌ی چاپ
              آماده است.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            برای چاپ، در لپ‌تاپ بخش «فاکتورها» را باز کنید.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Button variant="outline" className="h-12 w-full" onClick={onNewSale}>
            <RotateCcw className="size-4" />
            فاکتور جدید (سبد خالی)
          </Button>
          {panelUrl ? (
            <Button variant="ghost" className="w-full" asChild>
              <a href={panelUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                باز کردن پنل وب
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
