// ============================================================
// Sales types: Invoice (Order), items, payments, customers
// ============================================================

import type { Product } from "./product";

export const INVOICE_STATUSES = [
  "DRAFT",
  "ISSUED",
  "PAID",
  "PARTIAL",
  "CANCELLED",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_METHODS = [
  "CASH",
  "CARD",
  "TRANSFER",
  "CREDIT",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  /** positive: customer owes us */
  balance: number;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerInput {
  name: string;
  phone?: string;
  address?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  product?: Product;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;
  customerId: string | null;
  customer?: Customer | null;
  items: InvoiceItem[];
  payments?: Payment[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  note: string | null;
  storeId: string;
  createdById: string;
  issuedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  method: PaymentMethod;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface InvoiceItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
}

export interface CreateInvoiceInput {
  customerId?: string;
  items: InvoiceItemInput[];
  discount?: number;
  tax?: number;
  note?: string;
  /** پرداخت اولیه هنگام صدور فاکتور */
  payment?: {
    method: PaymentMethod;
    amount: number;
    note?: string;
  };
  issueNow?: boolean;
}

export interface CreatePaymentInput {
  method: PaymentMethod;
  amount: number;
  note?: string;
}

/** `Order` is kept as an alias — in this domain an order is a sales invoice. */
export type Order = Invoice;
export type OrderStatus = InvoiceStatus;
