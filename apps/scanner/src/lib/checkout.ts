// ============================================================
// تبدیل سبد به فاکتور — منطق خالص (قابل تست)
//
// این تابع همان چیزی را می‌سازد که به `POST /api/invoices` می‌رود:
// اقلام، مالیات (از نرخ فروشگاه) و پرداخت. سرور هم دوباره اعتبارسنجی
// می‌کند (قیمت صندوق‌دار از دیتابیس، مالیات از تنظیمات).
// ============================================================

import type { CreateInvoiceInput } from "@my-store/shared-types";

/** روش پرداخت در اسکنر. «نسیه» = بدون پرداخت اولیه. */
export type PayChoice = "CASH" | "CARD" | "CREDIT";

export interface CheckoutLine {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface CheckoutTotals {
  count: number;
  subtotal: number;
  tax: number;
  total: number;
}

/** جمع‌های سبد بر اساس نرخ مالیات فروشگاه. */
export function computeTotals(
  lines: { qty: number; unitPrice: number }[],
  taxRate: number,
): CheckoutTotals {
  const subtotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
  const rate = Number.isFinite(taxRate) ? Math.max(0, taxRate) : 0;
  const tax = Math.round((subtotal * rate) / 100);
  return {
    count: lines.reduce((sum, line) => sum + line.qty, 0),
    subtotal,
    tax,
    total: subtotal + tax,
  };
}

/**
 * ساخت ورودی فاکتور برای API.
 *
 * @param lines اقلام سبد (شناسه کالا، تعداد، قیمت واحد)
 * @param totals جمع‌های محاسبه‌شده (مالیات و مبلغ نهایی)
 * @param method روش پرداخت؛ برای «نسیه» پرداختی ثبت نمی‌شود
 */
export function buildInvoiceInput(
  lines: CheckoutLine[],
  totals: Pick<CheckoutTotals, "tax" | "total">,
  method: PayChoice,
  note?: string,
): CreateInvoiceInput {
  const valid = lines.filter((line) => line.productId && line.qty > 0);
  if (valid.length === 0) {
    throw new Error("سبد خالی است");
  }

  return {
    items: valid.map((line) => ({
      productId: line.productId,
      qty: line.qty,
      unitPrice: line.unitPrice,
    })),
    tax: totals.tax,
    discount: 0,
    note,
    issueNow: true,
    // «نسیه» یعنی فاکتور صادر می‌شود ولی پولی نگرفته‌ایم
    payment:
      method === "CREDIT"
        ? undefined
        : {
            method,
            amount: totals.total,
            note: "پرداخت هنگام فروش (اسکنر)",
          },
  };
}
