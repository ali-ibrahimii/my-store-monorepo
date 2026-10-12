import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getInvoice } from "@/lib/repositories";
import { InvoiceActions } from "@/components/invoice-actions";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  return { title: `فاکتور ${id.slice(-6)}` };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const { id } = await params;

  const invoice = await getInvoice(session.user.storeId, id);
  if (!invoice) notFound();

  const remaining = Math.max(0, invoice.total - invoice.paidAmount);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" dir="ltr">
            {invoice.number}
          </h1>
          <p className="text-muted-foreground text-sm">
            {invoice.customer?.name ?? "مشتری حضوری"} · {formatDateJalali(invoice.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              invoice.status === "PAID"
                ? "success"
                : invoice.status === "CANCELLED"
                  ? "destructive"
                  : invoice.status === "DRAFT"
                    ? "secondary"
                    : "warning"
            }
          >
            {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
          </Badge>
          <Link href="/accounting" className="text-primary text-sm underline">
            بازگشت به فاکتورها
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>آیتم‌ها</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-right">
                    <th className="p-2 font-medium">محصول</th>
                    <th className="p-2 font-medium">بارکد</th>
                    <th className="p-2 font-medium">تعداد</th>
                    <th className="p-2 font-medium">قیمت واحد</th>
                    <th className="p-2 font-medium">جمع</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">
                        {item.product?.name ?? (
                          <Link href="/products" className="text-primary underline" dir="ltr">
                            {item.productId}
                          </Link>
                        )}
                      </td>
                      <td className="p-2" dir="ltr">
                        {item.product?.barcode ?? "—"}
                      </td>
                      <td className="p-2">{item.qty}</td>
                      <td className="p-2">{formatCurrency(item.unitPrice)}</td>
                      <td className="p-2">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">جمع کل</dt>
                <dd>{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">تخفیف</dt>
                <dd>{formatCurrency(invoice.discount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">مالیات</dt>
                <dd>{formatCurrency(invoice.tax)}</dd>
              </div>
              <div className="flex justify-between border-t pt-1 font-bold">
                <dt>مبلغ فاکتور</dt>
                <dd>{formatCurrency(invoice.total)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">پرداخت‌شده</dt>
                <dd>{formatCurrency(invoice.paidAmount)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt className="text-muted-foreground">باقی‌مانده</dt>
                <dd>{formatCurrency(remaining)}</dd>
              </div>
            </dl>

            {invoice.note ? (
              <p className="text-muted-foreground border-t pt-3 text-sm">یادداشت: {invoice.note}</p>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>پرداخت‌ها</CardTitle>
            </CardHeader>
            <CardContent>
              {(invoice.payments ?? []).length === 0 ? (
                <p className="text-muted-foreground text-sm">پرداختی ثبت نشده است.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {(invoice.payments ?? []).map((payment) => (
                    <li key={payment.id} className="border-b pb-2 last:border-0">
                      <div className="flex items-center justify-between gap-2">
                        <span>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</span>
                        <span className="font-medium">{formatCurrency(payment.amount)}</span>
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {formatDateJalali(payment.createdAt)}
                        {payment.note ? ` · ${payment.note}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>عملیات</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceActions invoice={invoice} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
