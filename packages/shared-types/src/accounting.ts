// ============================================================
// Accounting types: purchases, expenses, ledger, reports
// ============================================================

import type { Product } from "./product";
import type { PaymentMethod } from "./order";

export interface Purchase {
  id: string;
  number: string;
  supplier: string | null;
  total: number;
  paidAmount: number;
  note: string | null;
  storeId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  product?: Product;
  qty: number;
  unitCost: number;
  total: number;
}

export interface CreatePurchaseInput {
  supplier?: string;
  note?: string;
  items: { productId: string; qty: number; unitCost: number }[];
}

export interface ExpenseCategory {
  id: string;
  name: string;
  storeId: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  note: string | null;
  receiptUrl: string | null;
  categoryId: string | null;
  category?: ExpenseCategory | null;
  storeId: string;
  createdById: string;
  createdAt: string;
}

export interface CreateExpenseInput {
  title: string;
  amount: number;
  date?: string;
  note?: string;
  categoryId?: string;
}

// ---- Ledger (دفتر کل — double entry) ----

export const LEDGER_ACCOUNTS = [
  "CASH_BANK",
  "SALES_REVENUE",
  "COGS",
  "INVENTORY",
  "ACCOUNTS_RECEIVABLE",
  "ACCOUNTS_PAYABLE",
  "EXPENSE",
] as const;
export type LedgerAccount = (typeof LEDGER_ACCOUNTS)[number];

export const LEDGER_TYPES = ["DEBIT", "CREDIT"] as const;
export type LedgerType = (typeof LEDGER_TYPES)[number];

export interface Transaction {
  id: string;
  date: string;
  account: LedgerAccount;
  type: LedgerType;
  amount: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  storeId: string;
  createdAt: string;
}

// ---- Reports ----

export interface SummaryReport {
  todayRevenue: number;
  monthRevenue: number;
  todayExpenses: number;
  monthExpenses: number;
  netProfitToday: number;
  netProfitMonth: number;
  inventoryValue: number;
  lowStockCount: number;
  unpaidInvoicesAmount: number;
  invoiceCount: number;
}

export interface ProfitLossRow {
  account: LedgerAccount;
  label: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ProfitLossReport {
  from: string;
  to: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  rows: ProfitLossRow[];
}

export interface DailySalesPoint {
  date: string;
  revenue: number;
  invoiceCount: number;
}

export interface SalesReport {
  points: DailySalesPoint[];
  totalRevenue: number;
  totalInvoices: number;
}

export interface RecordPaymentInput {
  method: PaymentMethod;
  amount: number;
  note?: string;
}
