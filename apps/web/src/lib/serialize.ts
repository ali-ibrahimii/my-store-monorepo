// ============================================================
// DTO mapping: MongoDB document → شکل JSON که کلاینت‌ها می‌شناسند
//
// چرا لازم است؟
//   - در MongoDB کلید اصلی `_id` از نوع ObjectId است، ولی در JSON باید
//     رشته باشد. این لایه ObjectId → string و Date → ISO string می‌کند.
//   - کلاینت (وب و موبایل) نباید هیچ‌وقت شکل داخلی دیتابیس را ببیند.
// ============================================================

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
  ScanEvent,
  Transaction,
} from "@my-store/shared-types";
import { idOf } from "./db";
import type {
  CategoryDoc,
  CustomerDoc,
  ExpenseCategoryDoc,
  ExpenseDoc,
  InvoiceDoc,
  ProductDoc,
  ScanEventDoc,
  TransactionDoc,
  UserDoc,
} from "./models";

const iso = (value: Date | string | null | undefined): string =>
  value instanceof Date ? value.toISOString() : (value ?? new Date(0).toISOString());

export function categoryDTO(c: CategoryDoc): Category {
  return {
    id: idOf(c._id),
    name: c.name,
    slug: c.slug,
    storeId: idOf(c.storeId),
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function productDTO(p: ProductDoc, category?: CategoryDoc | null): Product {
  return {
    id: idOf(p._id),
    name: p.name,
    sku: p.sku ?? null,
    barcode: p.barcode,
    description: p.description ?? null,
    costPrice: Number(p.costPrice ?? 0),
    salePrice: Number(p.salePrice ?? 0),
    stock: Number(p.stock ?? 0),
    lowStockThreshold: Number(p.lowStockThreshold ?? 0),
    categoryId: idOf(p.categoryId) || null,
    category: category ? categoryDTO(category) : null,
    storeId: idOf(p.storeId),
    createdAt: iso(p.createdAt),
    updatedAt: iso(p.updatedAt),
  };
}

export function customerDTO(c: CustomerDoc): Customer {
  return {
    id: idOf(c._id),
    name: c.name,
    phone: c.phone ?? null,
    address: c.address ?? null,
    balance: Number(c.balance ?? 0),
    storeId: idOf(c.storeId),
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
  };
}

export function expenseCategoryDTO(c: ExpenseCategoryDoc): ExpenseCategory {
  return { id: idOf(c._id), name: c.name, storeId: idOf(c.storeId) };
}

export function expenseDTO(e: ExpenseDoc, category?: ExpenseCategoryDoc | null): Expense {
  return {
    id: idOf(e._id),
    title: e.title,
    amount: Number(e.amount ?? 0),
    date: iso(e.date),
    note: e.note ?? null,
    receiptUrl: e.receiptUrl ?? null,
    categoryId: idOf(e.categoryId) || null,
    category: category ? expenseCategoryDTO(category) : null,
    storeId: idOf(e.storeId),
    createdById: idOf(e.createdById),
    createdAt: iso(e.createdAt),
  };
}

export function transactionDTO(t: TransactionDoc): Transaction {
  return {
    id: idOf(t._id),
    date: iso(t.date),
    account: t.account,
    type: t.type,
    amount: Number(t.amount ?? 0),
    refType: t.refType ?? null,
    refId: t.refId ?? null,
    note: t.note ?? null,
    storeId: idOf(t.storeId),
    createdAt: iso(t.createdAt),
  };
}

interface InvoiceRelations {
  customer?: CustomerDoc | null;
  /** نقشه‌ی productId(hex) → محصول */
  products?: Map<string, ProductDoc>;
}

export function invoiceDTO(i: InvoiceDoc, relations: InvoiceRelations = {}): Invoice {
  const invoiceId = idOf(i._id);
  const items: InvoiceItem[] = (i.items ?? []).map((item) => {
    const product = relations.products?.get(idOf(item.productId));
    return {
      id: idOf(item._id) || `${invoiceId}-item`,
      invoiceId,
      productId: idOf(item.productId),
      product: product ? productDTO(product) : undefined,
      qty: Number(item.qty ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      total: Number(item.total ?? 0),
    };
  });

  const payments: Payment[] = (i.payments ?? []).map((p) => ({
    id: idOf(p._id),
    invoiceId,
    method: p.method,
    amount: Number(p.amount ?? 0),
    note: p.note ?? null,
    createdAt: iso(p.createdAt),
  }));

  return {
    id: invoiceId,
    number: i.number,
    status: i.status,
    customerId: idOf(i.customerId) || null,
    customer: relations.customer ? customerDTO(relations.customer) : null,
    items,
    payments,
    subtotal: Number(i.subtotal ?? 0),
    discount: Number(i.discount ?? 0),
    tax: Number(i.tax ?? 0),
    total: Number(i.total ?? 0),
    paidAmount: Number(i.paidAmount ?? 0),
    note: i.note ?? null,
    storeId: idOf(i.storeId),
    createdById: idOf(i.createdById),
    issuedAt: i.issuedAt ? iso(i.issuedAt) : null,
    createdAt: iso(i.createdAt),
    updatedAt: iso(i.updatedAt),
  };
}

interface ScanRelations {
  product?: ProductDoc | null;
  user?: UserDoc | null;
}

export function scanEventDTO(e: ScanEventDoc, relations: ScanRelations = {}): ScanEvent {
  const product = relations.product;
  return {
    id: idOf(e._id),
    productId: idOf(e.productId) || null,
    barcode: e.barcode,
    type: e.type,
    qty: Number(e.qty ?? 1),
    device: e.device ?? null,
    note: e.note ?? null,
    userId: idOf(e.userId) || null,
    userName: relations.user?.name ?? relations.user?.email ?? null,
    storeId: idOf(e.storeId),
    createdAt: iso(e.createdAt),
    product: product
      ? {
          id: idOf(product._id),
          name: product.name,
          barcode: product.barcode,
          salePrice: Number(product.salePrice ?? 0),
          stock: Number(product.stock ?? 0),
        }
      : null,
  };
}

export function pageDTO<T>(items: T[], total: number, page: number, pageSize: number): Page<T> {
  return { items, total, page, pageSize };
}
