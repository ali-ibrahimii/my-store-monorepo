import { notFound } from "next/navigation";

import {
  formatCurrency,
  formatDateTimeJalali,
  PAYMENT_METHOD_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

import { PrintControls } from "@/components/print-controls";
import { requirePageUser } from "@/lib/auth";
import { getInvoice, getStore } from "@/lib/repositories";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `چاپ فاکتور ${id.slice(-6)}` };
}

/**
 * صفحه‌ی چاپ فاکتور (رسید مشتری).
 *
 * عمداً بیرون از گروه داشبورد است تا سایدبار و منوها چاپ نشوند؛
 * خودِ برگه با `.print-area` مشخص شده و CSS چاپ در globals.css فقط
 * همان را روی کاغذ می‌برد. با `?auto=0` چاپ خودکار خاموش می‌شود.
 */
export default async function PrintInvoicePage({ params, searchParams }: PageProps) {
  const user = await requirePageUser();
  const { id } = await params;
  const { auto } = await searchParams;

  const [invoice, store] = await Promise.all([getInvoice(user.storeId, id), getStore(user.storeId)]);
  if (!invoice) notFound();

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);
  const autoPrint = auto !== "0";

  return (
    <main className="bg-muted/30 min-h-svh p-4 md:p-8">
      <div className="mx-auto w-full max-w-3xl">
        <PrintControls auto={autoPrint} backHref={`/accounting/invoices/${invoice.id}`} />

        <div className="print-area receipt bg-card text-card-foreground rounded-xl border p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* سرصفحه فروشگاه */}
          <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-4">
            <div className="space-y-1">
              <h1 className="text-xl font-bold">{store?.name ?? "فروشگاه من"}</h1>
              {store?.address ? (
                <p className="text-muted-foreground text-xs">{store.address}</p>
              ) : null}
              <p className="text-muted-foreground text-xs" dir="ltr">
                {store?.phone ?? ""}
              </p>
            </div>
            <div className="text-end">
              <div className="text-sm font-semibold">فاکتور فروش</div>
              <div className="text-lg font-bold" dir="ltr">
                {invoice.number}
              </div>
              <div className="text-muted-foreground text-xs">
                {formatDateTimeJalali(invoice.createdAt)}
              </div>
            </div>
          </header>

          {/* مشتری */}
          <section className="grid gap-2 border-b py-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">خریدار: </span>
              <span className="font-medium">{invoice.customer?.name ?? "مشتری حضوری"}</span>
            </div>
            {invoice.customer?.phone ? (
              <div>
                <span className="text-muted-foreground">تلفن: </span>
                <span dir="ltr">{invoice.customer.phone}</span>
              </div>
            ) : null}
            <div>
              <span className="text-muted-foreground">تعداد اقلام: </span>
              <span>{toPersianDigits(invoice.items.length)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">صادرکننده: </span>
              <span>{user.name ?? user.email}</span>
            </div>
          </section>

          {/* اقلام */}
          <table className="receipt-table mt-4 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2 text-start font-medium">#</th>
                <th className="py-2 text-start font-medium">کالا</th>
                <th className="py-2 text-start font-medium">بارکد</th>
                <th className="py-2 text-center font-medium">تعداد</th>
                <th className="py-2 text-end font-medium">قیمت واحد</th>
                <th className="py-2 text-end font-medium">جمع</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-b align-top">
                  <td className="py-2 text-muted-foreground">{toPersianDigits(index + 1)}</td>
                  <td className="py-2 font-medium">{item.product?.name ?? "—"}</td>
                  <td className="py-2 text-xs" dir="ltr">
                    {item.product?.barcode ?? "—"}
                  </td>
                  <td className="py-2 text-center tabular-nums">{toPersianDigits(item.qty)}</td>
                  <td className="py-2 text-end tabular-nums">{formatCurrency(item.unitPrice)}</td>
                  <td className="py-2 text-end tabular-nums">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* جمع‌ها */}
          <section className="mt-4 flex flex-col items-end gap-1 text-sm">
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">جمع کل</span>
              <span className="tabular-nums">{formatCurrency(invoice.subtotal)}</span>
            </div>
            {invoice.discount > 0 ? (
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">تخفیف</span>
                <span className="tabular-nums">− {formatCurrency(invoice.discount)}</span>
              </div>
            ) : null}
            {invoice.tax > 0 ? (
              <div className="flex w-full max-w-xs justify-between">
                <span className="text-muted-foreground">مالیات</span>
                <span className="tabular-nums">{formatCurrency(invoice.tax)}</span>
              </div>
            ) : null}
            <div className="flex w-full max-w-xs justify-between border-t pt-1 text-base font-bold">
              <span>مبلغ قابل پرداخت</span>
              <span className="tabular-nums">{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between">
              <span className="text-muted-foreground">پرداخت‌شده</span>
              <span className="tabular-nums">{formatCurrency(invoice.paidAmount)}</span>
            </div>
            <div className="flex w-full max-w-xs justify-between font-medium">
              <span className="text-muted-foreground">باقی‌مانده</span>
              <span className="tabular-nums">{formatCurrency(remaining)}</span>
            </div>
          </section>

          {/* پرداخت‌ها */}
          {invoice.payments && invoice.payments.length > 0 ? (
            <section className="mt-4 border-t pt-3 text-xs">
              <div className="text-muted-foreground mb-1">روش پرداخت</div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1">
                {invoice.payments.map((payment) => (
                  <li key={payment.id}>
                    {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method} —{" "}
                    <span className="tabular-nums">{formatCurrency(payment.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {invoice.note ? (
            <p className="text-muted-foreground mt-3 text-xs">یادداشت: {invoice.note}</p>
          ) : null}

          <footer className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t pt-3 text-xs">
            <span className="text-muted-foreground">
              {store?.receiptFooter ?? "از خرید شما سپاسگزاریم."}
            </span>
            <span className="text-muted-foreground">مهر و امضا: ..................</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
