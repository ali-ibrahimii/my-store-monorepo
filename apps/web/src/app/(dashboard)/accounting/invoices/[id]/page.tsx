import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, CreditCard } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Separator } from "@my-store/ui-kit/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import {
  formatCurrency,
  formatDateJalali,
  PAYMENT_METHOD_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

import { InvoiceActions } from "@/components/invoice-actions";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { auth } from "@/lib/auth";
import { getInvoice } from "@/lib/repositories";

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
  const payments = invoice.payments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold" dir="ltr">
              {invoice.number}
            </h1>
            <InvoiceStatusBadge status={invoice.status} />
          </div>
          <p className="text-muted-foreground text-sm">
            {invoice.customer?.name ?? "مشتری حضوری"} ·{" "}
            {formatDateJalali(invoice.createdAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/accounting">
            <ArrowRight className="size-4" />
            بازگشت به فاکتورها
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>آیتم‌های فاکتور</CardTitle>
            <CardDescription>
              {toPersianDigits(invoice.items.length)} ردیف کالا در این فاکتور
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>محصول</TableHead>
                    <TableHead>بارکد</TableHead>
                    <TableHead>تعداد</TableHead>
                    <TableHead>قیمت واحد</TableHead>
                    <TableHead>جمع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {item.product?.name ?? (
                          <Link
                            href="/products"
                            className="text-primary underline-offset-4 hover:underline"
                            dir="ltr"
                          >
                            {item.productId}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-muted-foreground text-xs">
                        {item.product?.barcode ?? "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {toPersianDigits(item.qty)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatCurrency(item.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Separator />

            <dl className="ms-auto w-full max-w-xs space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">جمع کل</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">تخفیف</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.discount)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">مالیات</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.tax)}</dd>
              </div>
              <Separator />
              <div className="flex items-center justify-between font-bold">
                <dt>مبلغ فاکتور</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.total)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">پرداخت‌شده</dt>
                <dd className="tabular-nums">{formatCurrency(invoice.paidAmount)}</dd>
              </div>
              <div className="flex items-center justify-between font-medium">
                <dt className="text-muted-foreground">باقی‌مانده</dt>
                <dd className="tabular-nums">{formatCurrency(remaining)}</dd>
              </div>
            </dl>

            {invoice.note ? (
              <>
                <Separator />
                <p className="text-muted-foreground text-sm">
                  یادداشت: {invoice.note}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="size-4" />
                پرداخت‌ها
              </CardTitle>
              <CardDescription>
                {toPersianDigits(payments.length)} پرداخت ثبت شده
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <Empty className="border border-dashed p-4 md:p-6">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CreditCard />
                    </EmptyMedia>
                    <EmptyTitle>پرداختی ثبت نشده</EmptyTitle>
                    <EmptyDescription>
                      از بخش عملیات، پرداخت جدید ثبت کنید.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <ul className="space-y-3">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-start justify-between gap-3 border-b pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {formatDateJalali(payment.createdAt)}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </div>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatCurrency(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>عملیات</CardTitle>
              <CardDescription>
                ثبت پرداخت، تغییر وضعیت یا لغو فاکتور
              </CardDescription>
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
