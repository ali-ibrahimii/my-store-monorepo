import { CalendarRange, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Input } from "@my-store/ui-kit/components/input";
import { Label } from "@my-store/ui-kit/components/label";
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
  LEDGER_ACCOUNT_LABELS,
  PAYMENT_METHOD_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

import { PageHeader } from "@/components/page-header";
import { SalesChart } from "@/components/sales-chart";
import { StatCard } from "@/components/stat-card";
import { requireAdminPage } from "@/lib/auth";
import { buildSalesSeries } from "@/lib/sales-series";
import {
  getDailySales,
  getInventoryValue,
  getLedgerBreakdown,
  getPaymentBreakdown,
  getTopProducts,
} from "@/lib/stats";


export const dynamic = "force-dynamic";

export const metadata = { title: "گزارش‌ها" };

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const user = await requireAdminPage();
  const storeId = user.storeId;
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromDate = params.from ? new Date(params.from) : defaultFrom;
  const toDate = params.to ? new Date(params.to + "T23:59:59.999Z") : now;

  const [byAccount, dailyPoints, inventoryValue, topProducts, payments] = await Promise.all([
    getLedgerBreakdown(storeId, fromDate, toDate),
    getDailySales(storeId, fromDate, toDate),
    getInventoryValue(storeId),
    getTopProducts(storeId, fromDate, toDate),
    getPaymentBreakdown(storeId, fromDate, toDate),
  ]);

  const sum = (account: string) =>
    byAccount.get(account) ?? { debit: 0, credit: 0 };
  const revenue = sum("SALES_REVENUE").credit - sum("SALES_REVENUE").debit;
  const cogs = sum("COGS").debit - sum("COGS").credit;
  const expenses = sum("EXPENSE").debit - sum("EXPENSE").credit;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;

  const series = buildSalesSeries(dailyPoints, fromDate, toDate);

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارش‌های مالی"
        description={`بازه: ${formatDateJalali(fromDate)} تا ${formatDateJalali(toDate)}`}
      >
        <form className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="from" className="text-muted-foreground text-xs">
              از تاریخ
            </Label>
            <Input
              id="from"
              type="date"
              name="from"
              dir="ltr"
              className="w-[10.5rem]"
              defaultValue={params.from ?? fromDate.toISOString().slice(0, 10)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to" className="text-muted-foreground text-xs">
              تا تاریخ
            </Label>
            <Input
              id="to"
              type="date"
              name="to"
              dir="ltr"
              className="w-[10.5rem]"
              defaultValue={params.to ?? now.toISOString().slice(0, 10)}
            />
          </div>
          <Button type="submit">
            <CalendarRange className="size-4" />
            اعمال بازه
          </Button>
        </form>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="درآمد فروش"
          value={formatCurrency(revenue)}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          title="بهای تمام‌شده کالا"
          value={formatCurrency(cogs)}
          icon={Receipt}
        />
        <StatCard
          title="هزینه‌های عملیاتی"
          value={formatCurrency(expenses)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          title="سود خالص"
          value={formatCurrency(netProfit)}
          hint={`سود ناخالص: ${formatCurrency(grossProfit)}`}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <SalesChart
        points={series}
        title="روند فروش در بازه"
        description="مجموع مبلغ فاکتورهای غیرلغوشده هر روز"
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>دفتر کل — تفکیک حساب‌ها</CardTitle>
            <CardDescription>
              بدهکار، بستانکار و مانده هر حساب در بازه‌ی انتخابی
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byAccount.size === 0 ? (
              <p className="text-muted-foreground text-sm">
                تراکنشی در این بازه ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>حساب</TableHead>
                      <TableHead>بدهکار</TableHead>
                      <TableHead>بستانکار</TableHead>
                      <TableHead>مانده</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...byAccount.entries()].map(([account, value]) => (
                      <TableRow key={account}>
                        <TableCell className="font-medium">
                          {LEDGER_ACCOUNT_LABELS[account] ?? account}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(value.debit)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(value.credit)}
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">
                          {formatCurrency(value.debit - value.credit)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>خلاصه انبار</CardTitle>
            <CardDescription>ارزش موجودی به قیمت خرید</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-2xl font-bold tabular-nums">
              {formatCurrency(inventoryValue)}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              مجموع موجودی × قیمت خرید همه‌ی کالاها
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>پرفروش‌ها</CardTitle>
            <CardDescription>بر اساس مبلغ فروش در همین بازه</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>کالا</TableHead>
                  <TableHead>تعداد</TableHead>
                  <TableHead>مبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-center">
                      فروشی در این بازه نیست
                    </TableCell>
                  </TableRow>
                ) : (
                  topProducts.map((product) => (
                    <TableRow key={product.productId}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{toPersianDigits(product.qty)}</TableCell>
                      <TableCell>{formatCurrency(product.revenue)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>روش‌های پرداخت</CardTitle>
            <CardDescription>نقد، کارت، واریز و نسیه</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>روش</TableHead>
                  <TableHead>تعداد</TableHead>
                  <TableHead>مبلغ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-muted-foreground text-center">
                      پرداختی ثبت نشده
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((payment) => (
                    <TableRow key={payment.method}>
                      <TableCell>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</TableCell>
                      <TableCell>{toPersianDigits(payment.count)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
