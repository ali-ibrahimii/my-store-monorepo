// ============================================================
// آمار و گزارش‌ها — کوئری‌های تجمیعی (aggregation) روی MongoDB
//
// این توابع هم توسط API routeها استفاده می‌شوند و هم توسط صفحه‌ها،
// تا منطق محاسبه فقط یک جا نوشته شود.
// ============================================================

import type { Collection, Filter } from "mongodb";
import { collections } from "./db";
import type { ExpenseDoc, InvoiceDoc, TransactionDoc } from "./models";
import type { DailySalesPoint, SummaryReport } from "@my-store/shared-types";

interface SumResult {
  total: number;
  count: number;
}

/** جمع یک فیلد عددی با `$group` (معادل SUM در SQL) */
export async function sumByField(
  collection: Collection<any>,
  match: Record<string, unknown>,
  field: string,
): Promise<SumResult> {
  const rows = await collection
    .aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: `$${field}` }, count: { $sum: 1 } } },
    ])
    .toArray();
  return { total: Number(rows[0]?.total ?? 0), count: Number(rows[0]?.count ?? 0) };
}

/** خلاصه‌ی مالی داشبورد */
export async function getSummary(storeId: string): Promise<SummaryReport> {
  const { invoices, expenses, products } = await collections();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const notCancelled = { storeId, status: { $ne: "CANCELLED" } };

  const [todayInv, monthInv, todayExp, monthExp, unpaid, invoiceCount] = await Promise.all([
    sumByField(invoices, { ...notCancelled, createdAt: { $gte: startOfToday } }, "total"),
    sumByField(invoices, { ...notCancelled, createdAt: { $gte: startOfMonth } }, "total"),
    sumByField(expenses, { storeId, date: { $gte: startOfToday } }, "amount"),
    sumByField(expenses, { storeId, date: { $gte: startOfMonth } }, "amount"),
    sumByField(invoices, { storeId, status: { $in: ["ISSUED", "PARTIAL"] } }, "total"),
    invoices.countDocuments({ storeId }),
  ]);

  const productDocs = await products
    .find(
      { storeId },
      { projection: { stock: 1, costPrice: 1, lowStockThreshold: 1 } },
    )
    .toArray();

  const inventoryValue = productDocs.reduce(
    (sum, p) => sum + Number(p.stock ?? 0) * Number(p.costPrice ?? 0),
    0,
  );
  const lowStockCount = productDocs.filter(
    (p) => Number(p.stock ?? 0) <= Number(p.lowStockThreshold ?? 0),
  ).length;

  return {
    todayRevenue: todayInv.total,
    monthRevenue: monthInv.total,
    todayExpenses: todayExp.total,
    monthExpenses: monthExp.total,
    netProfitToday: todayInv.total - todayExp.total,
    netProfitMonth: monthInv.total - monthExp.total,
    inventoryValue,
    lowStockCount,
    unpaidInvoicesAmount: unpaid.total,
    invoiceCount,
  };
}

/** جمع کل هزینه‌ها (برای صفحه‌ی هزینه‌ها) */
export async function sumAllExpenses(storeId: string): Promise<number> {
  const { expenses } = await collections();
  const { total } = await sumByField(
    expenses as Collection<ExpenseDoc>,
    { storeId },
    "amount",
  );
  return total;
}

/** فروش روزانه در یک بازه */
export async function getDailySales(
  storeId: string,
  from: Date,
  to: Date,
): Promise<DailySalesPoint[]> {
  const { invoices } = await collections();

  const docs = await invoices
    .find(
      {
        storeId,
        createdAt: { $gte: from, $lte: to },
        status: { $ne: "CANCELLED" },
      } as Filter<InvoiceDoc>,
      { projection: { createdAt: 1, total: 1 } },
    )
    .toArray();

  const byDay = new Map<string, DailySalesPoint>();
  for (const invoice of docs) {
    const day = new Date(invoice.createdAt).toISOString().slice(0, 10);
    const point = byDay.get(day) ?? { date: day, revenue: 0, invoiceCount: 0 };
    point.revenue += Number(invoice.total);
    point.invoiceCount += 1;
    byDay.set(day, point);
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export interface AccountTotals {
  debit: number;
  credit: number;
}

/** تفکیک بدهکار/بستانکار دفتر کل در یک بازه */
export async function getLedgerBreakdown(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, AccountTotals>> {
  const { transactions } = await collections();

  const docs = await transactions
    .find({
      storeId,
      date: { $gte: from, $lte: to },
    } as Filter<TransactionDoc>)
    .toArray();

  const byAccount = new Map<string, AccountTotals>();
  for (const t of docs) {
    const entry = byAccount.get(t.account) ?? { debit: 0, credit: 0 };
    if (t.type === "DEBIT") entry.debit += Number(t.amount);
    else entry.credit += Number(t.amount);
    byAccount.set(t.account, entry);
  }
  return byAccount;
}

/** ارزش موجودی انبار (موجودی × قیمت خرید) */
export async function getInventoryValue(storeId: string): Promise<number> {
  const { products } = await collections();
  const docs = await products
    .find(
      { storeId },
      { projection: { stock: 1, costPrice: 1 } },
    )
    .toArray();
  return docs.reduce((sum, p) => sum + Number(p.stock ?? 0) * Number(p.costPrice ?? 0), 0);
}
