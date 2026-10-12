import type { Invoice, InvoiceStatus, PaymentMethod, SessionUser } from "@my-store/shared-types";

import { getInvoice } from "./repositories";
import { assertData, dbErrorMessage, getAdmin } from "./supabase";

export interface CreateInvoiceInput {
  customerId?: string | null;
  items: { productId: string; qty: number; unitPrice: number }[];
  discount?: number;
  tax?: number;
  note?: string | null;
  issueNow?: boolean;
  payment?: { method: PaymentMethod; amount: number; note?: string | null } | null;
}

async function callRpc(name: string, payload: Record<string, unknown>): Promise<string> {
  const result = await getAdmin().rpc(name, { payload });
  if (result.error) throw new Error(dbErrorMessage(result.error));
  const data = result.data as { id?: string } | null;
  if (!data?.id) throw new Error("عملیات دیتابیس نتیجه‌ای برنگرداند");
  return data.id;
}

/** صندوق‌دار نمی‌تواند قیمت یا تخفیف را عوض کند؛ مالیات از تنظیمات فروشگاه می‌آید. */
async function normalizeForRole(input: CreateInvoiceInput, user: SessionUser): Promise<CreateInvoiceInput> {
  if (user.role === "ADMIN") return input;
  const ids = [...new Set(input.items.map((item) => item.productId))];
  const products = assertData(
    await getAdmin().from("products").select("id, sale_price").eq("store_id", user.storeId).in("id", ids),
  ) as { id: string; sale_price: number | string }[];
  const prices = new Map(products.map((product) => [product.id, Number(product.sale_price)]));
  const store = assertData(
    await getAdmin().from("stores").select("tax_rate").eq("id", user.storeId).maybeSingle(),
  ) as { tax_rate: number | string } | null;
  const items = input.items.map((item) => ({
    ...item,
    unitPrice: prices.get(item.productId) ?? item.unitPrice,
  }));
  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const taxRate = Number(store?.tax_rate ?? 0);
  return {
    ...input,
    items,
    discount: 0,
    tax: Math.round((subtotal * taxRate) / 100),
  };
}

export async function createInvoice(input: CreateInvoiceInput, user: SessionUser): Promise<Invoice> {
  const normalized = await normalizeForRole(input, user);
  const id = await callRpc("create_invoice", {
    store_id: user.storeId,
    created_by: user.id,
    customer_id: normalized.customerId || null,
    discount: normalized.discount ?? 0,
    tax: normalized.tax ?? 0,
    note: normalized.note || null,
    issue_now: normalized.issueNow ?? true,
    items: normalized.items.map((item) => ({
      product_id: item.productId,
      qty: item.qty,
      unit_price: item.unitPrice,
    })),
    payment: normalized.payment
      ? {
          method: normalized.payment.method,
          amount: normalized.payment.amount,
          note: normalized.payment.note || null,
        }
      : null,
  });
  const invoice = await getInvoice(user.storeId, id);
  if (!invoice) throw new Error("فاکتور ساخته نشد");
  return invoice;
}

export async function setInvoiceStatus(
  invoiceId: string,
  status: InvoiceStatus,
  user: SessionUser,
): Promise<Invoice> {
  if (status === "CANCELLED" && user.role !== "ADMIN") {
    throw new Error("لغو فاکتور فقط برای مدیر مجاز است");
  }
  if (status === "PAID") {
    const current = await getInvoice(user.storeId, invoiceId);
    if (!current) throw new Error("فاکتور یافت نشد");
    const remaining = Math.max(0, current.total - current.paidAmount);
    if (remaining > 0) {
      return addPayment(invoiceId, { method: "CASH", amount: remaining, note: "تسویه" }, user);
    }
  }
  await callRpc("set_invoice_status", {
    store_id: user.storeId,
    invoice_id: invoiceId,
    status,
  });
  const invoice = await getInvoice(user.storeId, invoiceId);
  if (!invoice) throw new Error("فاکتور یافت نشد");
  return invoice;
}

export async function addPayment(
  invoiceId: string,
  payment: { method: PaymentMethod; amount: number; note?: string | null },
  user: SessionUser,
): Promise<Invoice> {
  await callRpc("add_invoice_payment", {
    store_id: user.storeId,
    invoice_id: invoiceId,
    method: payment.method,
    amount: payment.amount,
    note: payment.note || null,
  });
  const invoice = await getInvoice(user.storeId, invoiceId);
  if (!invoice) throw new Error("فاکتور یافت نشد");
  return invoice;
}
