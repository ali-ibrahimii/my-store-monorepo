// ============================================================
// Shared constants
// ============================================================

export const APP_NAME = "my-store";
export const APP_NAME_FA = "فروشگاه من";

export const DEFAULT_CURRENCY = "IRR";

export const API_ROUTES = {
  products: "/api/products",
  productLookup: "/api/products/lookup",
  categories: "/api/categories",
  customers: "/api/customers",
  invoices: "/api/invoices",
  expenses: "/api/expenses",
  expenseCategories: "/api/expense-categories",
  scan: "/api/scan",
  scanStream: "/api/scan/stream",
  reportsSummary: "/api/reports/summary",
  reportsProfitLoss: "/api/reports/profit-loss",
  reportsSales: "/api/reports/sales",
  register: "/api/auth/register",
} as const;

/** Roles, most privileged first. */
export const ROLE_LEVEL: Record<string, number> = {
  OWNER: 3,
  ACCOUNTANT: 2,
  CASHIER: 1,
};

export function hasRole(role: string, minimum: string): boolean {
  return (ROLE_LEVEL[role] ?? 0) >= (ROLE_LEVEL[minimum] ?? 0);
}

export const ROLE_LABELS: Record<string, string> = {
  OWNER: "مالک",
  ACCOUNTANT: "حسابدار",
  CASHIER: "صندوق‌دار",
};

export const SCAN_TYPE_LABELS: Record<string, string> = {
  SALE: "فروش",
  COUNT: "شمارش",
  CHECK_IN: "ورود به انبار",
  CHECK_OUT: "خروج از انبار",
  ADJUSTMENT: "اصلاح",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  ISSUED: "صادر شده",
  PAID: "پرداخت شده",
  PARTIAL: "پرداخت ناقص",
  CANCELLED: "لغو شده",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: "نقدی",
  CARD: "کارت",
  TRANSFER: "واریز",
  CREDIT: "اعتباری",
};

export const LEDGER_ACCOUNT_LABELS: Record<string, string> = {
  CASH_BANK: "صندوق/بانک",
  SALES_REVENUE: "درآمد فروش",
  COGS: "بهای تمام‌شده",
  INVENTORY: "موجودی انبار",
  ACCOUNTS_RECEIVABLE: "حساب‌های دریافتنی",
  ACCOUNTS_PAYABLE: "حساب‌های پرداختنی",
  EXPENSE: "هزینه‌ها",
};

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  PURCHASE: "خرید",
  SALE: "فروش",
  ADJUSTMENT: "اصلاح",
  SCAN_IN: "اسکن ورود",
  SCAN_OUT: "اسکن خروج",
};
