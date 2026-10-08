import type { Prisma } from "@prisma/client";
import type {
  Category,
  Customer,
  Expense,
  Invoice,
  Page,
  PaymentMethod,
  Product,
} from "@my-store/shared-types";

// Precise Prisma payload types (what the queries actually return)
export type CategoryPayload = Prisma.CategoryGetPayload<{}>;
export type ProductPayload = Prisma.ProductGetPayload<{}> & {
  category?: CategoryPayload | null;
};
export type CustomerPayload = Prisma.CustomerGetPayload<{}>;
export type InvoicePayload = Prisma.InvoiceGetPayload<{
  include: {
    items: { include: { product: true } };
    customer: true;
    payments: true;
  };
}>;
export type ExpensePayload = Prisma.ExpenseGetPayload<{ include: { category: true } }>;

const num = (value: unknown): number => Number(value ?? 0);
const iso = (value: Date | string): string =>
  value instanceof Date ? value.toISOString() : value;

export function categoryDTO(c: CategoryPayload): Category {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    storeId: c.storeId,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function productDTO(p: ProductPayload): Product {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    description: p.description,
    costPrice: num(p.costPrice),
    salePrice: num(p.salePrice),
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold,
    categoryId: p.categoryId,
    category: p.category ? categoryDTO(p.category) : null,
    storeId: p.storeId,
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function customerDTO(c: CustomerPayload): Customer {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    address: c.address,
    balance: num(c.balance),
    storeId: c.storeId,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function invoiceDTO(i: InvoicePayload): Invoice {
  return {
    id: i.id,
    number: i.number,
    status: i.status,
    customerId: i.customerId,
    customer: i.customer ? customerDTO(i.customer) : null,
    items: i.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      productId: item.productId,
      product: productDTO(item.product),
      qty: item.qty,
      unitPrice: num(item.unitPrice),
      total: num(item.total),
    })),
    payments: i.payments.map((p) => ({
      id: p.id,
      invoiceId: p.invoiceId,
      method: p.method as PaymentMethod,
      amount: num(p.amount),
      note: p.note,
      createdAt: iso(p.createdAt),
    })),
    subtotal: num(i.subtotal),
    discount: num(i.discount),
    tax: num(i.tax),
    total: num(i.total),
    paidAmount: num(i.paidAmount),
    note: i.note,
    storeId: i.storeId,
    createdById: i.createdById,
    issuedAt: i.issuedAt ? iso(i.issuedAt) : null,
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
  };
}

export function expenseDTO(e: ExpensePayload): Expense {
  return {
    id: e.id,
    title: e.title,
    amount: num(e.amount),
    date: iso(e.date),
    note: e.note,
    receiptUrl: e.receiptUrl,
    categoryId: e.categoryId,
    category: e.category
      ? { id: e.category.id, name: e.category.name, storeId: e.category.storeId }
      : null,
    storeId: e.storeId,
    createdById: e.createdById,
    createdAt: iso(e.createdAt),
  };
}

export function pageDTO<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize };
}
