import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  Wallet,
  Package,
  Receipt,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { listInvoices, listProducts } from "@/lib/repositories";
import { getSummary } from "@/lib/stats";
import { StatCard } from "@/components/stat-card";
import { ScanFeed } from "@/components/scan-feed";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "داشبورد" };

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const now = new Date();

  const [summary, recentPage, lowStockPage, allProductsPage] = await Promise.all([
    getSummary(storeId),
    listInvoices(storeId, { page: 1, pageSize: 8 }),
    listProducts(storeId, { lowStock: true, page: 1, pageSize: 8 }),
    listProducts(storeId, { page: 1, pageSize: 1 }),
  ]);

  const recentInvoices = recentPage.items;
  const lowStock = lowStockPage.items;
  const productCount = allProductsPage.total;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-muted-foreground text-sm">نمای کلی فروشگاه — {formatDateJalali(now)}</p>
      </div>

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
          icon={Wallet}
        />
        <StatCard
          title="سود خالص امروز"
          value={formatCurrency(summary.netProfitToday)}
          hint={`هزینه امروز: ${formatCurrency(summary.todayExpenses)}`}
          icon={TrendingUp}
          tone={summary.netProfitToday >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="ارزش موجودی انبار"
          value={formatCurrency(summary.inventoryValue)}
          hint={`${toPersianDigits(productCount)} قلم کالا`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="سود خالص این ماه"
          value={formatCurrency(summary.netProfitMonth)}
          hint={`هزینه ماه: ${formatCurrency(summary.monthExpenses)}`}
          icon={TrendingUp}
          tone={summary.netProfitMonth >= 0 ? "success" : "danger"}
        />
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
        <Link href="/scan" className="block">
          <Card className="h-full border-dashed transition-colors hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                اسکن سریع
              </CardTitle>
              <ScanLine className="text-muted-foreground h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-primary text-2xl font-bold">باز کردن اسکنر</div>
              <p className="text-muted-foreground mt-1 text-xs">اسکن بارکد با دوربین گوشی</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* فید زنده‌ی اسکن گوشی — لحظه‌ای از SSE به‌روز می‌شود */}
      <ScanFeed />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              آخرین فاکتورها
              <Link href="/accounting" className="text-primary text-sm underline">
                همه
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentInvoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">هنوز فاکتوری ثبت نشده است.</p>
            ) : (
              <ul className="space-y-3">
                {recentInvoices.map((inv) => (
                  <li
                    key={inv.id}
                    className="border-b pb-2 last:border-0 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-medium">{inv.number}</div>
                      <div className="text-muted-foreground text-xs">
                        {inv.customer?.name ?? "مشتری حضوری"} · {formatDateJalali(inv.createdAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          inv.status === "PAID"
                            ? "success"
                            : inv.status === "CANCELLED"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                      </Badge>
                      <span className="text-sm font-medium">{formatCurrency(inv.total)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              کالاهای کم‌موجود
              <Link href="/products" className="text-primary text-sm underline">
                همه
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">همه کالاها موجودی کافی دارند. ✅</p>
            ) : (
              <ul className="space-y-3">
                {lowStock.map((p) => (
                  <li
                    key={p.id}
                    className="border-b pb-2 last:border-0 flex items-center justify-between gap-3"
                  >
                    <span className="truncate text-sm">{p.name}</span>
                    <Badge variant="warning">
                      {toPersianDigits(p.stock)} / {toPersianDigits(p.lowStockThreshold)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
