// ============================================================
// سرویس فاکتور فروش — همه‌ی منطق کسب‌وکار یک جا
//
// هر فاکتور سه اثر روی داده‌ها دارد:
//   1) موجودی انبار (کاهش/افزایش + ثبت حرکت انبار)
//   2) مانده‌حساب مشتری (قسمت پرداخت‌نشده = دریافتنی)
//   3) دفتر کل دوطرفه (اسناد بدهکار/بستانکار)
//
// `runInTransaction` این کارها را روی MongoDB واقعی (replica set)
// به‌صورت اتمیک انجام می‌دهد و در غیر این صورت به‌ترتیب اجرا می‌کند.
// ============================================================

import { ObjectId, type ClientSession, type Filter } from "mongodb";
import type { Invoice, InvoiceStatus, PaymentMethod, SessionUser } from "@my-store/shared-types";
import { collections, idOf, idOrThrow, oid, runInTransaction } from "./db";
import { getInvoice } from "./repositories";
import { nextNumber, postInvoiceLedger, postPaymentLedger } from "./ledger";
import type { InvoiceDoc, InvoiceItemDoc, PaymentDoc, ProductDoc } from "./models";

export interface CreateInvoiceInput {
  customerId?: string | null;
  items: { productId: string; qty: number; unitPrice: number }[];
  discount?: number;
  tax?: number;
  note?: string | null;
  issueNow?: boolean;
  payment?: { method: PaymentMethod; amount: number; note?: string | null } | null;
}

async function loadProducts(
  storeId: string,
  productIds: string[],
  session?: ClientSession,
): Promise<ProductDoc[]> {
  const { products } = await collections();
  if (productIds.length === 0) return [];
  return products
    .find(
      { storeId, _id: { $in: productIds.map((v) => oid(v)) } } as Filter<ProductDoc>,
      { session },
    )
    .toArray();
}

/** اثرهای «صدور» فاکتور: موجودی، مانده مشتری، دفتر کل */
async function applyIssueEffects(
  invoice: InvoiceDoc,
  products: ProductDoc[],
  session?: ClientSession,
): Promise<void> {
  const { products: productCol, inventoryMovements, customers } = await collections();
  const invoiceId = idOf(invoice._id);

  for (const item of invoice.items) {
    await productCol.updateOne(
      { _id: oid(item.productId) },
      { $inc: { stock: -item.qty }, $set: { updatedAt: new Date() } },
      { session },
    );
    await inventoryMovements.insertOne(
      {
        _id: new ObjectId(),
        productId: item.productId,
        type: "SALE",
        qty: -item.qty,
        refType: "invoice",
        refId: invoiceId,
        note: `فاکتور ${invoice.number}`,
        createdAt: new Date(),
      },
      { session },
    );
  }

  const unpaid = Math.max(0, Number(invoice.total) - Number(invoice.paidAmount));
  if (invoice.customerId && unpaid > 0) {
    await customers.updateOne(
      { _id: oid(invoice.customerId) },
      { $inc: { balance: unpaid }, $set: { updatedAt: new Date() } },
      { session },
    );
  }

  const costOfGoods = invoice.items.reduce((sum, item) => {
    const product = products.find((p) => idOf(p._id) === item.productId);
    return sum + item.qty * Number(product?.costPrice ?? 0);
  }, 0);

  await postInvoiceLedger(
    {
      id: invoiceId,
      storeId: invoice.storeId,
      total: Number(invoice.total),
      paidAmount: Number(invoice.paidAmount),
      costOfGoods,
      customerId: invoice.customerId,
    },
    `فاکتور ${invoice.number}`,
    session,
  );

  if (Number(invoice.paidAmount) > 0) {
    await postPaymentLedger(
      invoice.storeId,
      invoiceId,
      Number(invoice.paidAmount),
      `پرداخت فاکتور ${invoice.number}`,
      session,
    );
  }
}

/** اثرهای «لغو» فاکتور: برگشت موجودی، برگشت مانده مشتری، سند معکوس دفتر کل */
async function applyCancelEffects(invoice: InvoiceDoc, session?: ClientSession): Promise<void> {
  const { products, inventoryMovements, customers, transactions } = await collections();
  const invoiceId = idOf(invoice._id);

  for (const item of invoice.items) {
    await products.updateOne(
      { _id: oid(item.productId) },
      { $inc: { stock: item.qty }, $set: { updatedAt: new Date() } },
      { session },
    );
    await inventoryMovements.insertOne(
      {
        _id: new ObjectId(),
        productId: item.productId,
        type: "ADJUSTMENT",
        qty: item.qty,
        refType: "invoice",
        refId: invoiceId,
        note: `لغو فاکتور ${invoice.number}`,
        createdAt: new Date(),
      },
      { session },
    );
  }

  const unpaid = Math.max(0, Number(invoice.total) - Number(invoice.paidAmount));
  if (invoice.customerId && unpaid > 0) {
    await customers.updateOne(
      { _id: oid(invoice.customerId) },
      { $inc: { balance: -unpaid }, $set: { updatedAt: new Date() } },
      { session },
    );
  }

  // سند معکوس: همان مبالغ با جهت برعکس
  const existing = await transactions
    .find({ storeId: invoice.storeId, refId: invoiceId }, { session })
    .toArray();
  if (existing.length > 0) {
    await transactions.insertMany(
      existing.map((t) => ({
        ...t,
        _id: new ObjectId(),
        type: t.type === "DEBIT" ? ("CREDIT" as const) : ("DEBIT" as const),
        refType: "reversal",
        note: `لغو فاکتور ${invoice.number}`,
        date: new Date(),
        createdAt: new Date(),
      })),
      { session },
    );
  }
}

// ------------------------------------------------------------
// ساخت فاکتور
// ------------------------------------------------------------

export async function createInvoice(
  input: CreateInvoiceInput,
  user: SessionUser,
): Promise<Invoice> {
  const storeId = idOrThrow(user.storeId, "فروشگاه");
  const createdById = idOrThrow(user.id, "کاربر");

  return runInTransaction(async (session) => {
    const { invoices } = await collections();

    const itemProductIds = input.items.map((i) => idOrThrow(i.productId, "محصول"));
    const products = await loadProducts(storeId, itemProductIds, session);
    if (products.length !== input.items.length) {
      throw new Error("یکی از محصولات یافت نشد");
    }
    for (const item of input.items) {
      const product = products.find((p) => idOf(p._id) === item.productId)!;
      if (product.stock < item.qty) {
        throw new Error(`موجودی «${product.name}» کافی نیست (موجودی: ${product.stock})`);
      }
    }

    const subtotal = input.items.reduce((sum, i) => sum + i.qty * Number(i.unitPrice), 0);
    const discount = Number(input.discount ?? 0);
    const tax = Number(input.tax ?? 0);
    const total = Math.max(0, subtotal - discount + tax);

    const issueNow = input.issueNow ?? true;
    const paymentAmount = Math.min(Number(input.payment?.amount ?? 0), total);
    const paidAmount = issueNow ? paymentAmount : 0;
    const status: InvoiceStatus = !issueNow
      ? "DRAFT"
      : paidAmount >= total
        ? "PAID"
        : paidAmount > 0
          ? "PARTIAL"
          : "ISSUED";

    const number = await nextNumber(storeId, "invoice", session);
    const now = new Date();
    const _id = new ObjectId();

    const items: InvoiceItemDoc[] = input.items.map((item) => ({
      _id: new ObjectId().toHexString(),
      productId: idOrThrow(item.productId, "محصول"),
      qty: item.qty,
      unitPrice: Number(item.unitPrice),
      total: item.qty * Number(item.unitPrice),
    }));

    const payments: PaymentDoc[] =
      paymentAmount > 0
        ? [
            {
              _id: new ObjectId().toHexString(),
              method: input.payment!.method,
              amount: paymentAmount,
              note: input.payment?.note || null,
              createdAt: now,
            },
          ]
        : [];

    const doc: InvoiceDoc = {
      _id,
      number,
      status,
      customerId: input.customerId || null,
      items,
      payments,
      subtotal,
      discount,
      tax,
      total,
      paidAmount,
      note: input.note || null,
      storeId,
      createdById,
      issuedAt: issueNow ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await invoices.insertOne(doc, { session });

    if (issueNow) {
      await applyIssueEffects(doc, products, session);
    }

    const dto = await getInvoice(storeId, idOf(_id));
    if (!dto) throw new Error("فاکتور ساخته نشد");
    return dto;
  });
}

// ------------------------------------------------------------
// تغییر وضعیت فاکتور
// ------------------------------------------------------------

export async function setInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  user: SessionUser,
): Promise<Invoice> {
  const storeId = idOrThrow(user.storeId, "فروشگاه");

  return runInTransaction(async (session) => {
    const { invoices } = await collections();
    const invoice = await invoices.findOne({ _id: oid(invoiceId), storeId }, { session });
    if (!invoice) throw new Error("فاکتور یافت نشد");

    if (invoice.status === status) {
      const dto = await getInvoice(storeId, invoiceId);
      if (!dto) throw new Error("فاکتور یافت نشد");
      return dto;
    }

    if (status === "CANCELLED") {
      // لغو: اگر قبلاً صادر شده بود، اثرهایش را برمی‌گردانیم
      if (invoice.status !== "DRAFT") {
        await applyCancelEffects(invoice, session);
      }
      await invoices.updateOne(
        { _id: invoice._id },
        { $set: { status: "CANCELLED", updatedAt: new Date() } },
        { session },
      );
    } else if (invoice.status === "DRAFT") {
      // پیش‌نویس → صادر شده: حالا موجودی و دفتر کل ثبت می‌شود
      const products = await loadProducts(
        storeId,
        invoice.items.map((i) => i.productId),
        session,
      );
      const issuedAt = invoice.issuedAt ?? new Date();
      await invoices.updateOne(
        { _id: invoice._id },
        { $set: { status, issuedAt, updatedAt: new Date() } },
        { session },
      );
      await applyIssueEffects({ ...invoice, status, issuedAt }, products, session);
    } else {
      await invoices.updateOne(
        { _id: invoice._id },
        { $set: { status, updatedAt: new Date() } },
        { session },
      );
    }

    const dto = await getInvoice(storeId, invoiceId);
    if (!dto) throw new Error("فاکتور یافت نشد");
    return dto;
  });
}

// ------------------------------------------------------------
// ثبت پرداخت روی فاکتور
// ------------------------------------------------------------

export async function addPayment(
  invoiceId: string,
  payment: { method: PaymentMethod; amount: number; note?: string | null },
  user: SessionUser,
): Promise<Invoice> {
  const storeId = idOrThrow(user.storeId, "فروشگاه");

  return runInTransaction(async (session) => {
    const { invoices, customers } = await collections();
    const invoice = await invoices.findOne({ _id: oid(invoiceId), storeId }, { session });
    if (!invoice) throw new Error("فاکتور یافت نشد");

    const remaining = Number(invoice.total) - Number(invoice.paidAmount);
    if (payment.amount > remaining + 0.01) {
      throw new Error(`مبلغ پرداخت بیشتر از بدهی باقیمانده است (باقیمانده: ${remaining})`);
    }

    const amount = Math.min(payment.amount, remaining);
    await invoices.updateOne(
      { _id: invoice._id },
      {
        $push: {
          payments: {
            _id: new ObjectId().toHexString(),
            method: payment.method,
            amount,
            note: payment.note || null,
            createdAt: new Date(),
          } as PaymentDoc,
        },
        $inc: { paidAmount: amount },
        $set: {
          status: (Number(invoice.paidAmount) + amount >= Number(invoice.total)
            ? "PAID"
            : "PARTIAL") as InvoiceStatus,
          updatedAt: new Date(),
        },
      },
      { session },
    );

    await postPaymentLedger(storeId, invoiceId, amount, "پرداخت فاکتور", session);

    if (invoice.customerId) {
      await customers.updateOne(
        { _id: oid(invoice.customerId) },
        { $inc: { balance: -amount }, $set: { updatedAt: new Date() } },
        { session },
      );
    }

    const dto = await getInvoice(storeId, invoiceId);
    if (!dto) throw new Error("فاکتور یافت نشد");
    return dto;
  });
}
