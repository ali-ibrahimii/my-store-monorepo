// ============================================================
// دفتر کل دوطرفه (Double-entry ledger) روی MongoDB
//
// هر رویداد مالی چند «سند» متوازن (بدهکار/بستانکار) در کالکشن
// `transactions` می‌نویسد.
//
// همه‌ی توابع یک `session` اختیاری می‌گیرند تا اگر MongoDB از تراکنش
// پشتیبانی کند (replica set)، داخل همان تراکنش اجرا شوند.
// ============================================================

import { ObjectId, type ClientSession } from "mongodb";
import type { LedgerAccount, LedgerType } from "@my-store/shared-types";
import { collections, idOf, nextSequence } from "./db";

interface LedgerEntry {
  account: LedgerAccount;
  type: LedgerType;
  amount: number;
  refType: string;
  refId: string;
  note?: string;
}

async function postEntries(
  storeId: string | ObjectId,
  entries: LedgerEntry[],
  date: Date = new Date(),
  session?: ClientSession,
): Promise<void> {
  // کنترل درستی: جمع بدهکار باید برابر جمع بستانکار باشد
  const debit = entries.filter((e) => e.type === "DEBIT").reduce((sum, e) => sum + e.amount, 0);
  const credit = entries.filter((e) => e.type === "CREDIT").reduce((sum, e) => sum + e.amount, 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`اسناد دفتر کل متوازن نیست: debit=${debit} credit=${credit}`);
  }
  if (entries.length === 0) return;

  const { transactions } = await collections();
  const storeRef = idOf(storeId);

  await transactions.insertMany(
    entries.map((e) => ({
      _id: new ObjectId(),
      storeId: storeRef,
      date,
      account: e.account,
      type: e.type,
      amount: e.amount,
      refType: e.refType,
      refId: e.refId,
      note: e.note ?? null,
      createdAt: new Date(),
    })),
    { session },
  );
}

export interface InvoiceForLedger {
  id: string;
  storeId: string;
  total: number;
  paidAmount: number;
  costOfGoods: number;
  customerId: string | null;
}

/**
 * ثبت فاکتور فروش:
 *   DEBIT  CASH_BANK            = paidAmount
 *   DEBIT  ACCOUNTS_RECEIVABLE  = total - paidAmount   (قسمت پرداخت‌نشده)
 *   CREDIT SALES_REVENUE        = total
 *   DEBIT  COGS                 = costOfGoods
 *   CREDIT INVENTORY            = costOfGoods
 */
export async function postInvoiceLedger(
  invoice: InvoiceForLedger,
  note?: string,
  session?: ClientSession,
): Promise<void> {
  const unpaid = Math.max(0, invoice.total - invoice.paidAmount);
  const entries: LedgerEntry[] = [];

  if (invoice.paidAmount > 0) {
    entries.push({
      account: "CASH_BANK",
      type: "DEBIT",
      amount: invoice.paidAmount,
      refType: "invoice",
      refId: invoice.id,
      note,
    });
  }
  if (unpaid > 0) {
    entries.push({
      account: "ACCOUNTS_RECEIVABLE",
      type: "DEBIT",
      amount: unpaid,
      refType: "invoice",
      refId: invoice.id,
      note,
    });
  }
  entries.push({
    account: "SALES_REVENUE",
    type: "CREDIT",
    amount: invoice.total,
    refType: "invoice",
    refId: invoice.id,
    note,
  });
  if (invoice.costOfGoods > 0) {
    entries.push({
      account: "COGS",
      type: "DEBIT",
      amount: invoice.costOfGoods,
      refType: "invoice",
      refId: invoice.id,
      note,
    });
    entries.push({
      account: "INVENTORY",
      type: "CREDIT",
      amount: invoice.costOfGoods,
      refType: "invoice",
      refId: invoice.id,
      note,
    });
  }

  await postEntries(invoice.storeId, entries, new Date(), session);
}

/**
 * ثبت پرداخت مشتری:
 *   DEBIT  CASH_BANK            = amount
 *   CREDIT ACCOUNTS_RECEIVABLE  = amount
 */
export async function postPaymentLedger(
  storeId: string,
  invoiceId: string,
  amount: number,
  note?: string,
  session?: ClientSession,
): Promise<void> {
  await postEntries(
    storeId,
    [
      { account: "CASH_BANK", type: "DEBIT", amount, refType: "payment", refId: invoiceId, note },
      {
        account: "ACCOUNTS_RECEIVABLE",
        type: "CREDIT",
        amount,
        refType: "payment",
        refId: invoiceId,
        note,
      },
    ],
    new Date(),
    session,
  );
}

/**
 * ثبت هزینه:
 *   DEBIT  EXPENSE      = amount
 *   CREDIT CASH_BANK    = amount
 */
export async function postExpenseLedger(
  storeId: string,
  expenseId: string,
  amount: number,
  title: string,
  session?: ClientSession,
): Promise<void> {
  await postEntries(
    storeId,
    [
      {
        account: "EXPENSE",
        type: "DEBIT",
        amount,
        refType: "expense",
        refId: expenseId,
        note: title,
      },
      {
        account: "CASH_BANK",
        type: "CREDIT",
        amount,
        refType: "expense",
        refId: expenseId,
        note: title,
      },
    ],
    new Date(),
    session,
  );
}

/**
 * ثبت فاکتور خرید:
 *   DEBIT  INVENTORY         = total
 *   CREDIT ACCOUNTS_PAYABLE  = total - paidAmount
 *   CREDIT CASH_BANK         = paidAmount
 */
export async function postPurchaseLedger(
  purchase: { id: string; storeId: string; total: number; paidAmount: number },
  note?: string,
  session?: ClientSession,
): Promise<void> {
  const unpaid = Math.max(0, purchase.total - purchase.paidAmount);
  const entries: LedgerEntry[] = [
    {
      account: "INVENTORY",
      type: "DEBIT",
      amount: purchase.total,
      refType: "purchase",
      refId: purchase.id,
      note,
    },
  ];
  if (purchase.paidAmount > 0) {
    entries.push({
      account: "CASH_BANK",
      type: "CREDIT",
      amount: purchase.paidAmount,
      refType: "purchase",
      refId: purchase.id,
      note,
    });
  }
  if (unpaid > 0) {
    entries.push({
      account: "ACCOUNTS_PAYABLE",
      type: "CREDIT",
      amount: unpaid,
      refType: "purchase",
      refId: purchase.id,
      note,
    });
  }
  await postEntries(purchase.storeId, entries, new Date(), session);
}

/**
 * شماره‌ی بعدی یک سند، مثلاً INV-0007
 * با `$inc` روی کالکشن `counters` — حتی اگر دو کاربر همزمان فاکتور بزنند
 * شماره‌ی تکراری تولید نمی‌شود.
 */
export async function nextNumber(
  storeId: string,
  model: "invoice" | "purchase",
  session?: ClientSession,
): Promise<string> {
  const prefix = model === "invoice" ? "INV" : "PUR";
  const cols = await collections();

  let seq = await nextSequence(cols, storeId, model, session);

  // اگر داده‌های از قبل موجود باشد (مثلاً seed) ولی شمارنده تازه ساخته شده،
  // شماره را با تعداد واقعی اسناد هم‌تراز می‌کنیم.
  if (seq === 1 && model === "invoice") {
    const existing = await cols.invoices.countDocuments({ storeId }, { session });
    if (existing > 0) {
      const fixed = await cols.counters.findOneAndUpdate(
        { _id: `${idOf(storeId)}:${model}` } as never,
        { $set: { seq: existing + 1 } },
        { returnDocument: "after", session },
      );
      seq = fixed?.seq ?? existing + 1;
    }
  }

  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
