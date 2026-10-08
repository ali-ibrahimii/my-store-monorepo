import type { Prisma, PrismaClient } from "@prisma/client";

/**
 * Double-entry ledger posting (دفتر کل).
 *
 * Every financial event writes balanced DEBIT/CREDIT rows to `Transaction`.
 * All helpers accept a Prisma transaction client (`Prisma.TransactionClient`)
 * so they can run inside the same DB transaction as the business write.
 */

type Tx = Prisma.TransactionClient;

interface LedgerEntry {
  account: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  refType: string;
  refId: string;
  note?: string;
}

async function postEntries(
  tx: Tx,
  storeId: string,
  entries: LedgerEntry[],
  date: Date = new Date(),
): Promise<void> {
  // Sanity: debits must equal credits
  const debit = entries
    .filter((e) => e.type === "DEBIT")
    .reduce((sum, e) => sum + e.amount, 0);
  const credit = entries
    .filter((e) => e.type === "CREDIT")
    .reduce((sum, e) => sum + e.amount, 0);
  if (Math.abs(debit - credit) > 0.01) {
    throw new Error(`Unbalanced ledger entries: debit=${debit} credit=${credit}`);
  }

  await tx.transaction.createMany({
    data: entries.map((e) => ({
      storeId,
      date,
      account: e.account as never,
      type: e.type as never,
      amount: e.amount,
      refType: e.refType,
      refId: e.refId,
      note: e.note ?? null,
    })),
  });
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
 * Post a sales invoice:
 *   DEBIT  CASH_BANK            = paidAmount
 *   DEBIT  ACCOUNTS_RECEIVABLE  = total - paidAmount   (when unpaid)
 *   CREDIT SALES_REVENUE        = total
 *   DEBIT  COGS                 = costOfGoods
 *   CREDIT INVENTORY            = costOfGoods
 */
export async function postInvoiceLedger(
  tx: Tx,
  invoice: InvoiceForLedger,
  note?: string,
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

  await postEntries(tx, invoice.storeId, entries, new Date());
}

/**
 * Post a customer payment:
 *   DEBIT  CASH_BANK            = amount
 *   CREDIT ACCOUNTS_RECEIVABLE  = amount
 */
export async function postPaymentLedger(
  tx: Tx,
  storeId: string,
  invoiceId: string,
  amount: number,
  note?: string,
): Promise<void> {
  await postEntries(
    tx,
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
  );
}

/**
 * Post an expense:
 *   DEBIT  EXPENSE      = amount
 *   CREDIT CASH_BANK    = amount
 */
export async function postExpenseLedger(
  tx: Tx,
  storeId: string,
  expenseId: string,
  amount: number,
  title: string,
): Promise<void> {
  await postEntries(
    tx,
    storeId,
    [
      { account: "EXPENSE", type: "DEBIT", amount, refType: "expense", refId: expenseId, note: title },
      { account: "CASH_BANK", type: "CREDIT", amount, refType: "expense", refId: expenseId, note: title },
    ],
    new Date(),
  );
}

/**
 * Post a purchase:
 *   DEBIT  INVENTORY         = total
 *   CREDIT ACCOUNTS_PAYABLE  = total - paidAmount
 *   CREDIT CASH_BANK         = paidAmount
 */
export async function postPurchaseLedger(
  tx: Tx,
  purchase: { id: string; storeId: string; total: number; paidAmount: number },
  note?: string,
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
  await postEntries(tx, purchase.storeId, entries, new Date());
}

/** Next sequential document number per store, e.g. INV-0007 */
export async function nextNumber(
  tx: Tx,
  storeId: string,
  model: "invoice" | "purchase",
): Promise<string> {
  const prefix = model === "invoice" ? "INV" : "PUR";
  const count = await (model === "invoice"
    ? tx.invoice.count({ where: { storeId } })
    : tx.purchase.count({ where: { storeId } }));
  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
}

export type { PrismaClient };
