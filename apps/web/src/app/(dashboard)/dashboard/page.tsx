import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Package,
  Receipt,
  AlertTriangle,
  ScanLine,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  const storeId = session!.user.storeId;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayInvoices,
    monthInvoices,
    todayExpenses,
    monthExpenses,
    products,
    recentInvoices,
    unpaidInvoices,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { storeId, createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { storeId, createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.expense.aggregate({ where: { storeId, date: { gte: startOfToday } }, _sum: { amount: true } }),
    prisma.expense.aggregate({ where: { storeId, date: { gte: startOfMonth } }, _sum: { amount: true } }),
    prisma.product.findMany({
      where: { storeId },
      select: { id: true, name: true, stock: true, costPrice: true, lowStockThreshold: true },
    }),
    prisma.invoice.findMany({
      where: { storeId },
      include: { customer: true, items: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.invoice.aggregate({
      where: { storeId, status: { in: ["ISSUED", "PARTIAL"] } },
      _sum: { total: true },
    }),
  ]);

  const todayRevenue = Number(todayInvoices._sum.total ?? 0);
  const monthRevenue = Number(monthInvoices._sum.total ?? 0);
  const todayExp = Number(todayExpenses._sum.amount ?? 0);
  const monthExp = Number(monthExpenses._sum.amount ?? 0);
  const inventoryValue = products.reduce((s, p) => s + p.stock * Number(p.costPrice), 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">داشبورد</h1>
        <p className="text-muted-foreground text-sm">نمای کلی فروشگاه — {formatDateJalali(now)}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="فروش امروز"
          value={formatCurrency(todayRevenue)}
          hint={`${toPersianDigits(todayInvoices._count)} فاکتور`}
          icon={TrendingUp}
          tone="success"
        />
        <StatCard
          title="درآمد این ماه"
          value={formatCurrency(monthRevenue)}
          icon={Wallet}
        />
        <StatCard
          title="سود خالص امروز"
          value={formatCurrency(todayRevenue - todayExp)}
          hint={`هزینه امروز: ${formatCurrency(todayExp)}`}
          icon={TrendingUp}
          tone={todayRevenue - todayExp >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="ارزش موجودی انبار"
          value={formatCurrency(inventoryValue)}
          hint={`${toPersianDigits(products.length)} قلم کالا`}
          icon={Package}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="سود خالص این ماه"
          value={formatCurrency(monthRevenue - monthExp)}
          hint={`هزینه ماه: ${formatCurrency(monthExp)}`}
          icon={TrendingUp}
          tone={monthRevenue - monthExp >= 0 ? "success" : "danger"}
        />
        <StatCard
          title="فاکتورهای پرداخت‌نشده"
          value={formatCurrency(Number(unpaidInvoices._sum.total ?? 0))}
          icon={Receipt}
          tone="warning"
        />
        <StatCard
          title="کالاهای کم‌موجود"
          value={toPersianDigits(lowStock.length)}
          hint="موجودی کمتر یا مساوی حداقل"
          icon={AlertTriangle}
          tone={lowStock.length > 0 ? "warning" : "default"}
        />
        <Link href="/scan" className="block">
          <Card className="h-full border-dashed transition-colors hover:border-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                اسکن سریع
              </CardTitle>
              <ScanLine className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">باز کردن اسکنر</div>
              <p className="text-muted-foreground mt-1 text-xs">اسکن بارکد با دوربین گوشی</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              آخرین فاکتورها
              <Link href="/accounting" className="text-sm text-primary underline">
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
                  <li key={inv.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
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
                      <span className="text-sm font-medium">{formatCurrency(Number(inv.total))}</span>
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
              <Link href="/products" className="text-sm text-primary underline">
                همه
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-muted-foreground text-sm">همه کالاها موجودی کافی دارند. ✅</p>
            ) : (
              <ul className="space-y-3">
                {lowStock.slice(0, 8).map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
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
