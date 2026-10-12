// ============================================================
// Shared constants
// ============================================================

export const APP_NAME = "my-store";
export const APP_NAME_FA = "فروشگاه من";

export const DEFAULT_CURRENCY = "IRR";

export const API_ROUTES = {
  products: "/api/products",
  productLookup: "/api/products/lookup",
  /** ساخت/ثبت بارکد محصولات (تب «بارکدها») */
  barcodes: "/api/barcodes",
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
  /** سلامت سرور + دیتابیس (بدون نیاز به نشست) */
  health: "/api/health",
  /**
   * ورود اپ موبایل: برخلاف وب (که کوکی نشست می‌گیرد) یک توکن Bearer
   * برمی‌گرداند، چون React Native کوکی ذخیره نمی‌کند.
   */
  mobileLogin: "/api/auth/mobile/login",
  /** اعتبارسنجی توکن موبایل و گرفتن کاربر جاری */
  mobileSession: "/api/auth/mobile/session",
} as const;

/**
 * نام کوکی حامل توکن اپ موبایل در پلتفرم وب.
 * پروکسی‌های پیش‌نمایش (e2b/arena) هدر `Authorization` را از درخواست حذف
 * می‌کنند ولی کوکی را (مثل وب‌اپ) عبور می‌دهند؛ پس اپ وبِ موبایل توکن را
 * هم در کوکی می‌گذارد. این کوکی با کوکی نشست Auth.js یکی نیست.
 */
export const MOBILE_TOKEN_COOKIE = "mystore_mobile_token";

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
