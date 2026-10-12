import type {
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  Invoice,
  InvoiceItem,
  Page,
  Payment,
  Product,
  Purchase,
  PurchaseItem,
  ScanEvent,
  Store,
  Transaction,
} from "@my-store/shared-types";

const num = (value: number | string | null | undefined) => Number(value ?? 0);
const iso = (value: string | null | undefined) => value ?? new Date(0).toISOString();

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function pageDTO<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize };
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  name: string;
  sku: string | null;
  barcode: string;
  description: string | null;
  cost_price: number | string;
  sale_price: number | string;
  stock: number;
  low_stock_threshold: number;
  category_id: string | null;
  store_id: string;
  created_at: string;
  updated_at: string;
  categories?: CategoryRow | CategoryRow[] | null;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  balance: number | string;
  store_id: string;
  created_at: string;
  updated_at: string;
}

export interface StoreRow {
  id: string;
  name: string;
  slug: string;
  currency: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  tax_rate: number | string;
  invoice_prefix: string;
  receipt_footer: string | null;
  low_stock_default: number;
  created_at: string;
  updated_at: string;
}

export function storeDTO(row: StoreRow): Store {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    currency: row.currency,
    phone: row.phone,
    address: row.address,
    email: row.email,
    taxRate: num(row.tax_rate),
    invoicePrefix: row.invoice_prefix,
    receiptFooter: row.receipt_footer,
    lowStockDefault: Number(row.low_stock_default ?? 5),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function categoryDTO(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    storeId: row.store_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function productDTO(row: ProductRow, category?: CategoryRow | null): Product {
  const nested = category ?? one(row.categories);
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode ?? "",
    description: row.description,
    costPrice: num(row.cost_price),
    salePrice: num(row.sale_price),
    stock: Number(row.stock ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? 0),
    categoryId: row.category_id,
    category: nested ? categoryDTO(nested) : null,
    storeId: row.store_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export function customerDTO(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    address: row.address,
    note: row.note ?? null,
    balance: num(row.balance),
    storeId: row.store_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface ExpenseCategoryRow {
  id: string;
  name: string;
  store_id: string;
}

export function expenseCategoryDTO(row: ExpenseCategoryRow): ExpenseCategory {
  return { id: row.id, name: row.name, storeId: row.store_id };
}

export interface ExpenseRow {
  id: string;
  title: string;
  amount: number | string;
  date: string;
  note: string | null;
  receipt_url: string | null;
  category_id: string | null;
  store_id: string;
  created_by: string | null;
  created_at: string;
  expense_categories?: ExpenseCategoryRow | ExpenseCategoryRow[] | null;
}

export function expenseDTO(row: ExpenseRow, category?: ExpenseCategoryRow | null): Expense {
  const nested = category ?? one(row.expense_categories);
  return {
    id: row.id,
    title: row.title,
    amount: num(row.amount),
    date: iso(row.date),
    note: row.note,
    receiptUrl: row.receipt_url,
    categoryId: row.category_id,
    category: nested ? expenseCategoryDTO(nested) : null,
    storeId: row.store_id,
    createdById: row.created_by ?? "",
    createdAt: iso(row.created_at),
  };
}

export interface LedgerRow {
  id: string;
  date: string;
  account: Transaction["account"];
  type: Transaction["type"];
  amount: number | string;
  ref_type: string | null;
  ref_id: string | null;
  note: string | null;
  store_id: string;
  created_at: string;
}

export function transactionDTO(row: LedgerRow): Transaction {
  return {
    id: row.id,
    date: iso(row.date),
    account: row.account,
    type: row.type,
    amount: num(row.amount),
    refType: row.ref_type,
    refId: row.ref_id,
    note: row.note,
    storeId: row.store_id,
    createdAt: iso(row.created_at),
  };
}

export interface InvoiceItemRow {
  id: string;
  invoice_id: string;
  product_id: string;
  qty: number;
  unit_price: number | string;
  total: number | string;
  products?: ProductRow | ProductRow[] | null;
}

export interface PaymentRow {
  id: string;
  invoice_id: string;
  method: Payment["method"];
  amount: number | string;
  note: string | null;
  created_at: string;
}

export interface InvoiceRow {
  id: string;
  number: string;
  status: Invoice["status"];
  customer_id: string | null;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  paid_amount: number | string;
  note: string | null;
  store_id: string;
  created_by: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
  customers?: CustomerRow | CustomerRow[] | null;
  invoice_items?: InvoiceItemRow[] | null;
  payments?: PaymentRow[] | null;
}

export function invoiceDTO(row: InvoiceRow): Invoice {
  const customer = one(row.customers);
  const items: InvoiceItem[] = (row.invoice_items ?? []).map((item) => {
    const product = one(item.products);
    return {
      id: item.id,
      invoiceId: item.invoice_id,
      productId: item.product_id,
      product: product ? productDTO(product) : undefined,
      qty: Number(item.qty),
      unitPrice: num(item.unit_price),
      total: num(item.total),
    };
  });
  const payments: Payment[] = (row.payments ?? []).map((payment) => ({
    id: payment.id,
    invoiceId: payment.invoice_id,
    method: payment.method,
    amount: num(payment.amount),
    note: payment.note,
    createdAt: iso(payment.created_at),
  }));
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customerId: row.customer_id,
    customer: customer ? customerDTO(customer) : null,
    items,
    payments,
    subtotal: num(row.subtotal),
    discount: num(row.discount),
    tax: num(row.tax),
    total: num(row.total),
    paidAmount: num(row.paid_amount),
    note: row.note,
    storeId: row.store_id,
    createdById: row.created_by ?? "",
    issuedAt: row.issued_at,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

export interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  product_id: string;
  qty: number;
  unit_cost: number | string;
  total: number | string;
  products?: ProductRow | ProductRow[] | null;
}

export interface PurchaseRow {
  id: string;
  number: string;
  supplier: string | null;
  total: number | string;
  paid_amount: number | string;
  note: string | null;
  store_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  purchase_items?: PurchaseItemRow[] | null;
}

export function purchaseDTO(row: PurchaseRow): Purchase {
  const items: PurchaseItem[] = (row.purchase_items ?? []).map((item) => {
    const product = one(item.products);
    return {
      id: item.id,
      purchaseId: item.purchase_id,
      productId: item.product_id,
      product: product ? productDTO(product) : undefined,
      qty: Number(item.qty),
      unitCost: num(item.unit_cost),
      total: num(item.total),
    };
  });
  return {
    id: row.id,
    number: row.number,
    supplier: row.supplier,
    total: num(row.total),
    paidAmount: num(row.paid_amount),
    note: row.note,
    storeId: row.store_id,
    createdById: row.created_by ?? "",
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    items,
  };
}

export interface ScanRow {
  id: string;
  product_id: string | null;
  barcode: string;
  type: ScanEvent["type"];
  qty: number;
  device: string | null;
  note: string | null;
  user_id: string | null;
  store_id: string;
  created_at: string;
  products?: ProductRow | ProductRow[] | null;
  profiles?: { name: string | null; email: string } | { name: string | null; email: string }[] | null;
}

export function scanEventDTO(row: ScanRow): ScanEvent {
  const product = one(row.products);
  const user = one(row.profiles);
  return {
    id: row.id,
    productId: row.product_id,
    barcode: row.barcode,
    type: row.type,
    qty: Number(row.qty),
    device: row.device,
    note: row.note,
    userId: row.user_id,
    userName: user?.name ?? user?.email ?? null,
    storeId: row.store_id,
    createdAt: iso(row.created_at),
    product: product
      ? {
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          salePrice: num(product.sale_price),
          stock: Number(product.stock),
        }
      : null,
  };
}

export function redactProduct(product: Product, role: string): Product {
  if (role === "ADMIN") return product;
  return { ...product, costPrice: 0 };
}
