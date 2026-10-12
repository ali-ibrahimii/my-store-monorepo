import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Package,
  Receipt,
  ScanLine,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
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
import { Progress } from "@my-store/ui-kit/components/progress";
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
  toPersianDigits,
} from "@my-store/shared-utils";

import { PageHeader } from "@/components/page-header";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { SalesChart } from "@/components/sales-chart";
import { ScanFeed } from "@/components/scan-feed";
import { StatCard } from "@/components/stat-card";
import { requirePageUser } from "@/lib/auth";
import { listInvoices, listProducts } from "@/lib/repositories";
import { buildSalesSeries, daysAgo } from "@/lib/sales-series";
import { getDailySales, getSummary } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata = { title: "داشبورد" };

export default async function DashboardPage() {
  const user = await requirePageUser();
  const storeId = user.storeId;
  const isAdmin = user.role === "ADMIN";

  const now = new Date();
  const weekStart = daysAgo(7, now);

  const [summary, recentPage, lowStockPage, allProductsPage, dailySales] =
    await Promise.all([
      getSummary(storeId),
      listInvoices(storeId, { page: 1, pageSize: 8 }),
      listProducts(storeId, { lowStock: true, page: 1, pageSize: 6 }),
      listProducts(storeId, { page: 1, pageSize: 1 }),
      getDailySales(storeId, weekStart, now),
    ]);

  const recentInvoices = recentPage.items;
  const lowStock = lowStockPage.items;
  const productCount = allProductsPage.total;
  const series = buildSalesSeries(dailySales, weekStart, now);
  const weekRevenue = series.reduce((sum, point) => sum + point.revenue, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد"
        description={`نمای کلی فروشگاه — ${formatDateJalali(now)}`}
      >
        <Button asChild>
          <Link href="/scan">
            <ScanLine className="size-4" />
            اسکن سریع
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="فروش امروز"
          value={formatCurrency(summary.todayRevenue)}
          hint={`${toPersianDigits(summary.invoiceCount)} فاکتور کل`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          title="درآمد این ماه"
          value={formatCurrency(summary.monthRevenue)}
          hint={`فروش ۷ روز: ${formatCurrency(weekRevenue)}`}
          icon={Wallet}
        />
        {isAdmin ? (
          <StatCard
            title="سود خالص امروز"
            value={formatCurrency(summary.netProfitToday)}
            hint={`هزینه امروز: ${formatCurrency(summary.todayExpenses)}`}
            icon={TrendingUp}
            tone={summary.netProfitToday >= 0 ? "success" : "danger"}
          />
        ) : (
          <StatCard
            title="نقش شما"
            value="صندوق‌دار"
            hint="تغییر قیمت و گزارش سود برای مدیر است"
            icon={Receipt}
          />
        )}
        {isAdmin ? (
          <StatCard
            title="ارزش موجودی انبار"
            value={formatCurrency(summary.inventoryValue)}
            hint={`${toPersianDigits(productCount)} قلم کالا`}
            icon={Package}
          />
        ) : (
          <StatCard
            title="تعداد کالا"
            value={toPersianDigits(productCount)}
            hint="قیمت خرید برای صندوق‌دار پنهان است"
            icon={Package}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isAdmin ? (
        <StatCard
          title="سود خالص این ماه"
          value={formatCurrency(summary.netProfitMonth)}
          hint={`هزینه ماه: ${formatCurrency(summary.monthExpenses)}`}
          icon={TrendingUp}
          tone={summary.netProfitMonth >= 0 ? "success" : "danger"}
        />
        ) : null}
        <StatCard
          title="فاکتورهای پرداخت‌نشده"
          value={formatCurrency(summary.unpaidInvoicesAmount)}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          title="کالاهای کم‌موجود"
          value={toPersianDigits(summary.lowStockCount)}
          hint="موجودی کمتر یا مساوی حداقل"
          icon={AlertTriangle}
          tone={summary.lowStockCount > 0 ? "warning" : "default"}
        />
        <Card className="border-dashed">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-sm font-medium">اسکن سریع</CardTitle>
              <CardDescription className="text-xs">
                اسکن بارکد با دوربین گوشی
              </CardDescription>
            </div>
            <div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
              <ScanLine className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" size="sm" className="w-full">
              <Link href="/scan">
                باز کردن اسکنر
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <SalesChart
            points={series}
            title="فروش ۷ روز گذشته"
            description={`جمع این هفته: ${formatCurrency(weekRevenue)}`}
          />
        </div>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              کالاهای کم‌موجود
              <Button variant="ghost" size="sm" asChild>
                <Link href="/products">همه</Link>
              </Button>
            </CardTitle>
            <CardDescription>موجودی کمتر یا مساوی حداقل تعیین‌شده</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lowStock.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Package />
                  </EmptyMedia>
                  <EmptyTitle>همه کالاها موجودی کافی دارند</EmptyTitle>
                  <EmptyDescription>
                    هشدارها وقتی موجودی به حداقل برسد اینجا ظاهر می‌شوند.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              lowStock.map((product) => {
                const threshold = Number(product.lowStockThreshold) || 0;
                const stock = Number(product.stock) || 0;
                const ratio =
                  threshold > 0 ? Math.min(100, (stock / threshold) * 100) : 0;
                return (
                  <div key={product.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{product.name}</span>
                      <Badge variant="warning" className="shrink-0">
                        {toPersianDigits(stock)} / {toPersianDigits(threshold)}
                      </Badge>
                    </div>
                    <Progress value={ratio} />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              آخرین فاکتورها
              <Button variant="ghost" size="sm" asChild>
                <Link href="/accounting">همه</Link>
              </Button>
            </CardTitle>
            <CardDescription>۸ فاکتور آخر فروشگاه</CardDescription>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <Empty className="border border-dashed">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Receipt />
                  </EmptyMedia>
                  <EmptyTitle>هنوز فاکتوری ثبت نشده</EmptyTitle>
                  <EmptyDescription>
                    از صفحه‌ی فاکتورها اولین فروش را ثبت کنید.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>شماره</TableHead>
                      <TableHead>مشتری</TableHead>
                      <TableHead>تاریخ</TableHead>
                      <TableHead>مبلغ</TableHead>
                      <TableHead>وضعیت</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell dir="ltr" className="font-medium">
                          <Link
                            href={`/accounting/invoices/${invoice.id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {invoice.number}
                          </Link>
                        </TableCell>
                        <TableCell>{invoice.customer?.name ?? "حضوری"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatDateJalali(invoice.createdAt)}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {formatCurrency(Number(invoice.total))}
                        </TableCell>
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          <ScanFeed />
        </div>
      </div>
    </div>
  );
}
