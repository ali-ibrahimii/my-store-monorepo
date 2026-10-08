import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import {
  formatCurrency,
  formatDateJalali,
  LEDGER_ACCOUNT_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";
import { TrendingUp, TrendingDown, Wallet, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = { title: "گزارش‌ها" };

type PageProps = {
  searchParams: Promise<{ from?: string; to?: string }>;
};

export default async function ReportsPage({ searchParams }: PageProps) {
  const session = await auth();
  const storeId = session!.user.storeId;
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const fromDate = params.from ? new Date(params.from) : defaultFrom;
  const toDate = params.to ? new Date(params.to + "T23:59:59.999Z") : now;

  const [transactions, invoices, products] = await Promise.all([
    prisma.transaction.findMany({
      where: { storeId, date: { gte: fromDate, lte: toDate } },
    }),
    prisma.invoice.findMany({
      where: {
        storeId,
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, total: true },
    }),
    prisma.product.findMany({
      where: { storeId },
      select: { stock: true, costPrice: true },
    }),
  ]);

  const byAccount = new Map<string, { debit: number; credit: number }>();
  for (const t of transactions) {
    const entry = byAccount.get(t.account) ?? { debit: 0, credit: 0 };
    if (t.type === "DEBIT") entry.debit += Number(t.amount);
    else entry.credit += Number(t.amount);
    byAccount.set(t.account, entry);
  }
  const sum = (account: string) => byAccount.get(account) ?? { debit: 0, credit: 0 };

  const revenue = sum("SALES_REVENUE").credit - sum("SALES_REVENUE").debit;
  const cogs = sum("COGS").debit - sum("COGS").credit;
  const expenses = sum("EXPENSE").debit - sum("EXPENSE").credit;
  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - expenses;
  const inventoryValue = products.reduce((s: any, p: any) => s + p.stock * Number(p.costPrice), 0);

  // Daily sales series for the bar chart
  const byDay = new Map<string, number>();
  for (const inv of invoices) {
    const day = inv.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + Number(inv.total));
  }
  const points = [...byDay.entries()].sort((a: any, b: any) => a[0].localeCompare(b[0]));
  const maxRevenue = Math.max(1, ...points.map((p: any) => p[1]));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">گزارش‌های مالی</h1>
          <p className="text-muted-foreground text-sm">
            بازه: {formatDateJalali(fromDate)} تا {formatDateJalali(toDate)}
          </p>
        </div>
        <form className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">از</label>
            <input
              type="date"
              name="from"
              dir="ltr"
              defaultValue={params.from ?? fromDate.toISOString().slice(0, 10)}
              className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-muted-foreground text-xs">تا</label>
            <input
              type="date"
              name="to"
              dir="ltr"
              defaultValue={params.to ?? now.toISOString().slice(0, 10)}
              className="flex h-9 rounded-md border border-input bg-background px-2 text-sm"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-md bg-primary px-4 text-sm text-primary-foreground"
          >
            اعمال
          </button>
        </form>
      </div>

      {/* P&L */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="درآمد فروش" value={formatCurrency(revenue)} icon={TrendingUp} tone="success" />
        <StatCard title="بهای تمام‌شده (COGS)" value={formatCurrency(cogs)} icon={Receipt} tone="warning" />
        <StatCard title="سود ناخالص" value={formatCurrency(grossProfit)} icon={Wallet} />
        <StatCard
          title="سود خالص"
          value={formatCurrency(netProfit)}
          hint={`هزینه‌ها: ${formatCurrency(expenses)}`}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          tone={netProfit >= 0 ? "success" : "danger"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>فروش روزانه</CardTitle>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <p className="text-muted-foreground text-sm">در این بازه فروشی ثبت نشده است.</p>
            ) : (
              <div className="flex h-48 items-end gap-1">
                {points.map(([day, value]: any) => (
                  <div
                    key={day}
                    className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                    title={`${day}: ${formatCurrency(value)}`}
                  >
                    <span className="text-[10px] text-muted-foreground">
                      {toPersianDigits(value / 1000)}k
                    </span>
                    <div
                      className="w-full rounded-t bg-primary"
                      style={{ height: `${Math.max(4, (value / maxRevenue) * 100)}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground" dir="ltr">
                      {day.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ledger breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>دفتر کل — تفکیک حساب‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            {byAccount.size === 0 ? (
              <p className="text-muted-foreground text-sm">تراکنشی در این بازه ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-muted-foreground">
                      <th className="p-2 font-medium">حساب</th>
                      <th className="p-2 font-medium">بدهکار</th>
                      <th className="p-2 font-medium">بستانکار</th>
                      <th className="p-2 font-medium">مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...byAccount.entries()].map(([account, v]: any) => (
                      <tr key={account} className="border-b last:border-0">
                        <td className="p-2 font-medium">
                          {LEDGER_ACCOUNT_LABELS[account] ?? account}
                        </td>
                        <td className="p-2">{formatCurrency(v.debit)}</td>
                        <td className="p-2">{formatCurrency(v.credit)}</td>
                        <td className="p-2 font-medium">{formatCurrency(v.debit - v.credit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>خلاصه انبار</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            ارزش موجودی انبار (به قیمت خرید):{" "}
            <span className="font-bold text-primary">{formatCurrency(inventoryValue)}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
