import type { DailySalesPoint, SummaryReport } from "@my-store/shared-types";

import { assertData, getAdmin } from "./supabase";

interface InvoiceLite {
  total: number | string;
  paid_amount: number | string;
  status: string;
  created_at: string;
}

interface ExpenseLite {
  amount: number | string;
  date: string;
}

interface ProductLite {
  stock: number;
  cost_price: number | string;
  low_stock_threshold: number;
}

interface LedgerLite {
  account: string;
  type: string;
  amount: number | string;
}

export async function getSummary(storeId: string): Promise<SummaryReport> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [invoicesRes, expensesRes, productsRes, invoiceCountRes] = await Promise.all([
    getAdmin()
      .from("invoices")
      .select("total, paid_amount, status, created_at")
      .eq("store_id", storeId)
      .neq("status", "CANCELLED")
      .gte("created_at", startOfMonth),
    getAdmin()
      .from("expenses")
      .select("amount, date")
      .eq("store_id", storeId)
      .gte("date", startOfMonth),
    getAdmin()
      .from("products")
      .select("stock, cost_price, low_stock_threshold")
      .eq("store_id", storeId),
    getAdmin().from("invoices").select("id", { count: "exact", head: true }).eq("store_id", storeId),
  ]);

  const invoices = assertData(invoicesRes) as InvoiceLite[];
  const expenses = assertData(expensesRes) as ExpenseLite[];
  const products = assertData(productsRes) as ProductLite[];

  const sumSince = (rows: InvoiceLite[], since: string) =>
    rows.filter((row) => row.created_at >= since).reduce((sum, row) => sum + Number(row.total), 0);
  const expSince = (since: string) =>
    expenses.filter((row) => row.date >= since).reduce((sum, row) => sum + Number(row.amount), 0);

  const unpaidRes = await getAdmin()
    .from("invoices")
    .select("total, paid_amount")
    .eq("store_id", storeId)
    .in("status", ["ISSUED", "PARTIAL"]);
  const unpaidRows = assertData(unpaidRes) as { total: number | string; paid_amount: number | string }[];

  const inventoryValue = products.reduce(
    (sum, product) => sum + Number(product.stock ?? 0) * Number(product.cost_price ?? 0),
    0,
  );
  const lowStockCount = products.filter(
    (product) => Number(product.stock ?? 0) <= Number(product.low_stock_threshold ?? 0),
  ).length;

  const todayRevenue = sumSince(invoices, startOfToday);
  const monthRevenue = sumSince(invoices, startOfMonth);
  const todayExpenses = expSince(startOfToday);
  const monthExpenses = expSince(startOfMonth);

  return {
    todayRevenue,
    monthRevenue,
    todayExpenses,
    monthExpenses,
    netProfitToday: todayRevenue - todayExpenses,
    netProfitMonth: monthRevenue - monthExpenses,
    inventoryValue,
    lowStockCount,
    unpaidInvoicesAmount: unpaidRows.reduce(
      (sum, row) => sum + Math.max(0, Number(row.total) - Number(row.paid_amount)),
      0,
    ),
    invoiceCount: invoiceCountRes.count ?? 0,
  };
}

export async function sumAllExpenses(storeId: string): Promise<number> {
  const result = await getAdmin().from("expenses").select("amount").eq("store_id", storeId);
  return (assertData(result) as { amount: number | string }[]).reduce(
    (sum, row) => sum + Number(row.amount),
    0,
  );
}

export async function getDailySales(storeId: string, from: Date, to: Date): Promise<DailySalesPoint[]> {
  const result = await getAdmin()
    .from("invoices")
    .select("created_at, total")
    .eq("store_id", storeId)
    .neq("status", "CANCELLED")
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());
  const rows = assertData(result) as { created_at: string; total: number | string }[];
  const byDay = new Map<string, DailySalesPoint>();
  for (const invoice of rows) {
    const day = invoice.created_at.slice(0, 10);
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

export async function getLedgerBreakdown(
  storeId: string,
  from: Date,
  to: Date,
): Promise<Map<string, AccountTotals>> {
  const result = await getAdmin()
    .from("ledger_entries")
    .select("account, type, amount")
    .eq("store_id", storeId)
    .gte("date", from.toISOString())
    .lte("date", to.toISOString());
  const rows = assertData(result) as LedgerLite[];
  const byAccount = new Map<string, AccountTotals>();
  for (const row of rows) {
    const entry = byAccount.get(row.account) ?? { debit: 0, credit: 0 };
    if (row.type === "DEBIT") entry.debit += Number(row.amount);
    else entry.credit += Number(row.amount);
    byAccount.set(row.account, entry);
  }
  return byAccount;
}

export async function getInventoryValue(storeId: string): Promise<number> {
  const result = await getAdmin().from("products").select("stock, cost_price").eq("store_id", storeId);
  return (assertData(result) as ProductLite[]).reduce(
    (sum, product) => sum + Number(product.stock ?? 0) * Number(product.cost_price ?? 0),
    0,
  );
}

export interface TopProduct {
  productId: string;
  name: string;
  qty: number;
  revenue: number;
}

export async function getTopProducts(storeId: string, from: Date, to: Date): Promise<TopProduct[]> {
  const result = await getAdmin()
    .from("invoice_items")
    .select("qty, total, product_id, products(name), invoices!inner(store_id, status, created_at)")
    .eq("invoices.store_id", storeId)
    .neq("invoices.status", "CANCELLED")
    .gte("invoices.created_at", from.toISOString())
    .lte("invoices.created_at", to.toISOString());
  const rows = assertData(result) as {
    qty: number;
    total: number | string;
    product_id: string;
    products: { name: string } | { name: string }[] | null;
  }[];
  const map = new Map<string, TopProduct>();
  for (const row of rows) {
    const name = Array.isArray(row.products) ? row.products[0]?.name : row.products?.name;
    const current = map.get(row.product_id) ?? {
      productId: row.product_id,
      name: name ?? "کالای حذف‌شده",
      qty: 0,
      revenue: 0,
    };
    current.qty += Number(row.qty);
    current.revenue += Number(row.total);
    map.set(row.product_id, current);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 8);
}

export interface PaymentBreakdown {
  method: string;
  amount: number;
  count: number;
}

export async function getPaymentBreakdown(
  storeId: string,
  from: Date,
  to: Date,
): Promise<PaymentBreakdown[]> {
  const result = await getAdmin()
    .from("payments")
    .select("method, amount")
    .eq("store_id", storeId)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString());
  const rows = assertData(result) as { method: string; amount: number | string }[];
  const map = new Map<string, PaymentBreakdown>();
  for (const row of rows) {
    const current = map.get(row.method) ?? { method: row.method, amount: 0, count: 0 };
    current.amount += Number(row.amount);
    current.count += 1;
    map.set(row.method, current);
  }
  return [...map.values()].sort((a, b) => b.amount - a.amount);
}
