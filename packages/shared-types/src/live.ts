// ============================================================
// Live (real-time) sync types — اسکنر گوشی ← وب‌پنل
// ============================================================

import type { InvoiceStatus } from "./order";
import type { ScanEvent } from "./scan";

/**
 * سرِ سبک یک فاکتور برای فهرست‌ها و به‌روزرسانی لحظه‌ای.
 * (قلم‌ها و پرداخت‌های کامل در صفحه‌ی خود فاکتور لود می‌شوند.)
 */
export interface LiveInvoiceHead {
  id: string;
  number: string;
  status: InvoiceStatus;
  customerName: string | null;
  total: number;
  paidAmount: number;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

/** یک قلمِ سبدِ در حال تکمیل روی گوشی (از رویدادهای اسکن نوع CART). */
export interface LiveCartLine {
  barcode: string;
  productId: string | null;
  name: string | null;
  qty: number;
  salePrice: number;
  lastAt: string;
  device: string | null;
}

/** وضعیت لحظه‌ای فروشگاه — یک درخواست سبک برای پولینگ. */
export interface LiveSnapshot {
  /** فاکتورهای ساخته/به‌روزشده از زمان `since` (جدیدترین اول) */
  invoices: LiveInvoiceHead[];
  /** سبدهای در حال تکمیل روی گوشی‌ها */
  cart: LiveCartLine[];
  /** آخرین رویدادهای اسکن (برای فید زنده) */
  scans: ScanEvent[];
  /** مبنای زمانی سرور برای پولینگ بعدی */
  serverTime: string;
}

/** پیام کانال ریل‌تایم سوپابیس (postgres_changes). */
export interface LiveInvoiceChange {
  kind: "invoice";
  invoice: LiveInvoiceHead;
}
