// ============================================================
// Repositories — تنها جایی که کوئری‌های MongoDB نوشته می‌شود
//
// صفحه‌ها و API routeها به‌جای دست‌و‌پنجه نرم‌کردن با درایور،
// از این توابع آماده استفاده می‌کنند.
//
// الگوی رایج در MongoDB که اینجا استفاده شده: «دو کوئری به‌جای JOIN»
//   1) فاکتورها را می‌گیریم
//   2) شناسه‌های یکتای محصول/مشتری را جمع می‌کنیم و با `$in`
//      همه را یک‌جا می‌گیریم، بعد در حافظه به هم وصل می‌کنیم.
// ============================================================

import type { Filter } from "mongodb";
import { collections, idOf, oid } from "./db";
import type {
  CategoryDoc,
  CustomerDoc,
  ExpenseCategoryDoc,
  ExpenseDoc,
  InvoiceDoc,
  ProductDoc,
  ScanEventDoc,
  UserDoc,
} from "./models";
import {
  categoryDTO,
  customerDTO,
  expenseCategoryDTO,
  expenseDTO,
  invoiceDTO,
  pageDTO,
  productDTO,
  scanEventDTO,
} from "./serialize";
import type {
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  Invoice,
  Page,
  Product,
  ScanEvent,
} from "@my-store/shared-types";

/** فرار از کاراکترهای خاص regex تا جست‌وجوی کاربر کوئری را نشکند */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** جست‌وجوی بدون حساسیت به بزرگی/کوچکی حروف */
export function containsFilter(field: string, value: string): Record<string, unknown> {
  return { [field]: { $regex: escapeRegex(value), $options: "i" } };
}

// ------------------------------------------------------------
// Categories
// ------------------------------------------------------------

export async function listCategories(storeId: string): Promise<Category[]> {
  const { categories } = await collections();
  const docs = await categories.find({ storeId }).sort({ name: 1 }).toArray();
  return docs.map(categoryDTO);
}

/** نقشه‌ی categoryId → دسته (برای وصل‌کردن محصول به دسته‌اش) */
export async function mapCategories(
  storeId: string,
  ids: (string | null | undefined)[],
): Promise<Map<string, CategoryDoc>> {
  const unique = [...new Set(ids.filter(Boolean).map((v) => String(v)))];
  if (unique.length === 0) return new Map();
  const { categories } = await collections();
  const docs = await categories
    .find({ storeId, _id: { $in: unique.map((v) => oid(v)) } } as Filter<CategoryDoc>)
    .toArray();
  return new Map(docs.map((d) => [idOf(d._id), d]));
}

// ------------------------------------------------------------
// Products
// ------------------------------------------------------------

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listProducts(
  storeId: string,
  options: ListProductsOptions = {},
): Promise<Page<Product>> {
  const { products } = await collections();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20));

  const filter: Filter<ProductDoc> = {
    storeId,
    ...(options.categoryId ? { categoryId: options.categoryId } : {}),
    ...(options.search
      ? {
          $or: [
            containsFilter("name", options.search),
            containsFilter("barcode", options.search),
            containsFilter("sku", options.search),
          ] as Filter<ProductDoc>[],
        }
      : {}),
  };

  // «کم‌موجود» مقایسه‌ی بین دو فیلد است؛ در MongoDB با $expr انجام می‌شود.
  if (options.lowStock) {
    Object.assign(filter, { $expr: { $lte: ["$stock", "$lowStockThreshold"] } });
  }

  const [total, docs] = await Promise.all([
    products.countDocuments(filter),
    products
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  const cats = await mapCategories(storeId, docs.map((d) => d.categoryId));

  return pageDTO(
    docs.map((d) => productDTO(d, cats.get(idOf(d.categoryId)))),
    total,
    page,
    pageSize,
  );
}

/** همه‌ی محصولات یک فروشگاه (برای فرم‌ها و داشبورد) */
export async function listAllProducts(storeId: string): Promise<Product[]> {
  const { products } = await collections();
  const docs = await products.find({ storeId }).sort({ name: 1 }).toArray();
  const cats = await mapCategories(storeId, docs.map((d) => d.categoryId));
  return docs.map((d) => productDTO(d, cats.get(idOf(d.categoryId))));
}

export async function findProductDoc(storeId: string, id: string): Promise<ProductDoc | null> {
  const { products } = await collections();
  return products.findOne({ _id: oid(id), storeId });
}

export async function findProductDocByBarcode(
  storeId: string,
  barcode: string,
): Promise<ProductDoc | null> {
  const { products } = await collections();
  return products.findOne({ storeId, barcode });
}

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  const doc = await findProductDoc(storeId, id);
  if (!doc) return null;
  const cats = await mapCategories(storeId, [doc.categoryId]);
  return productDTO(doc, cats.get(idOf(doc.categoryId)));
}

// ------------------------------------------------------------
// Customers
// ------------------------------------------------------------

export async function listCustomers(storeId: string, search?: string): Promise<Customer[]> {
  const { customers } = await collections();
  const filter: Filter<CustomerDoc> = {
    storeId,
    ...(search
      ? {
          $or: [
            containsFilter("name", search),
            containsFilter("phone", search),
          ] as Filter<CustomerDoc>[],
        }
      : {}),
  };
  const docs = await customers.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
  return docs.map(customerDTO);
}

export async function findCustomerDoc(id: string | null): Promise<CustomerDoc | null> {
  if (!id) return null;
  const { customers } = await collections();
  return customers.findOne({ _id: oid(id) });
}

// ------------------------------------------------------------
// Invoices
// ------------------------------------------------------------

export interface ListInvoicesOptions {
  status?: string;
  page?: number;
  pageSize?: number;
  from?: Date;
  to?: Date;
}

/** وصل‌کردن فاکتور به مشتری و محصول‌هایش با دو کوئری `$in` */
async function attachInvoiceRelations(docs: InvoiceDoc[]) {
  const { customers, products } = await collections();

  const customerIds = [...new Set(docs.map((d) => d.customerId).filter(Boolean))].map((v) =>
    oid(v),
  );
  const productIds = [
    ...new Set(docs.flatMap((d) => (d.items ?? []).map((i) => i.productId)).filter(Boolean)),
  ].map((v) => oid(v));

  const [customerDocs, productDocs] = await Promise.all([
    customerIds.length
      ? customers.find({ _id: { $in: customerIds } } as Filter<CustomerDoc>).toArray()
      : Promise.resolve([] as CustomerDoc[]),
    productIds.length
      ? products.find({ _id: { $in: productIds } } as Filter<ProductDoc>).toArray()
      : Promise.resolve([] as ProductDoc[]),
  ]);

  return {
    customers: new Map(customerDocs.map((c) => [idOf(c._id), c])),
    products: new Map(productDocs.map((p) => [idOf(p._id), p])),
  };
}

export async function listInvoices(
  storeId: string,
  options: ListInvoicesOptions = {},
): Promise<Page<Invoice>> {
  const { invoices } = await collections();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20));

  const filter: Filter<InvoiceDoc> = {
    storeId,
    ...(options.status ? { status: options.status as InvoiceDoc["status"] } : {}),
    ...(options.from || options.to
      ? {
          createdAt: {
            ...(options.from ? { $gte: options.from } : {}),
            ...(options.to ? { $lte: options.to } : {}),
          },
        }
      : {}),
  };

  const [total, docs] = await Promise.all([
    invoices.countDocuments(filter),
    invoices
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  const { customers, products } = await attachInvoiceRelations(docs);

  return pageDTO(
    docs.map((d) =>
      invoiceDTO(d, { customer: customers.get(idOf(d.customerId)) ?? null, products }),
    ),
    total,
    page,
    pageSize,
  );
}

export async function getInvoice(storeId: string, id: string): Promise<Invoice | null> {
  const { invoices } = await collections();
  const doc = await invoices.findOne({ _id: oid(id), storeId });
  if (!doc) return null;
  const { customers, products } = await attachInvoiceRelations([doc]);
  return invoiceDTO(doc, {
    customer: customers.get(idOf(doc.customerId)) ?? null,
    products,
  });
}

export async function findInvoiceDoc(
  storeId: string,
  id: string,
): Promise<InvoiceDoc | null> {
  const { invoices } = await collections();
  return invoices.findOne({ _id: oid(id), storeId });
}

// ------------------------------------------------------------
// Expenses
// ------------------------------------------------------------

export async function listExpenses(
  storeId: string,
  options: { from?: Date; to?: Date; page?: number; pageSize?: number } = {},
): Promise<Page<Expense>> {
  const { expenses, expenseCategories } = await collections();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 20));

  const filter: Filter<ExpenseDoc> = {
    storeId,
    ...(options.from || options.to
      ? {
          date: {
            ...(options.from ? { $gte: options.from } : {}),
            ...(options.to ? { $lte: options.to } : {}),
          },
        }
      : {}),
  };

  const [total, docs] = await Promise.all([
    expenses.countDocuments(filter),
    expenses
      .find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  const categoryIds = [...new Set(docs.map((d) => d.categoryId).filter(Boolean))].map((v) =>
    oid(v),
  );
  const catDocs: ExpenseCategoryDoc[] = categoryIds.length
    ? await expenseCategories
        .find({ _id: { $in: categoryIds } } as Filter<ExpenseCategoryDoc>)
        .toArray()
    : [];
  const cats = new Map(catDocs.map((c) => [idOf(c._id), c]));

  return pageDTO(
    docs.map((d) => expenseDTO(d, cats.get(idOf(d.categoryId)))),
    total,
    page,
    pageSize,
  );
}

export async function listAllExpenses(storeId: string, limit = 100): Promise<Expense[]> {
  const result = await listExpenses(storeId, { page: 1, pageSize: limit });
  return result.items;
}

export async function listExpenseCategories(storeId: string): Promise<ExpenseCategory[]> {
  const { expenseCategories } = await collections();
  const docs = await expenseCategories.find({ storeId }).sort({ name: 1 }).toArray();
  return docs.map(expenseCategoryDTO);
}

// ------------------------------------------------------------
// Scan events
// ------------------------------------------------------------

export async function listScanEvents(
  storeId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<Page<ScanEvent>> {
  const { scanEvents, products, users } = await collections();
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 30));

  const filter: Filter<ScanEventDoc> = { storeId };

  const [total, docs] = await Promise.all([
    scanEvents.countDocuments(filter),
    scanEvents
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .toArray(),
  ]);

  const productIds = [...new Set(docs.map((d) => d.productId).filter(Boolean))].map((v) => oid(v));
  const userIds = [...new Set(docs.map((d) => d.userId).filter(Boolean))].map((v) => oid(v));

  const [productDocs, userDocs] = await Promise.all([
    productIds.length
      ? products.find({ _id: { $in: productIds } } as Filter<ProductDoc>).toArray()
      : Promise.resolve([] as ProductDoc[]),
    userIds.length
      ? users.find({ _id: { $in: userIds } } as Filter<UserDoc>).toArray()
      : Promise.resolve([] as UserDoc[]),
  ]);

  const prodMap = new Map(productDocs.map((p) => [idOf(p._id), p]));
  const userMap = new Map(userDocs.map((u) => [idOf(u._id), u]));

  return pageDTO(
    docs.map((d) =>
      scanEventDTO(d, {
        product: prodMap.get(idOf(d.productId)) ?? null,
        user: userMap.get(idOf(d.userId)) ?? null,
      }),
    ),
    total,
    page,
    pageSize,
  );
}
