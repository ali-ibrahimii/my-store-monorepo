import type {
  Category,
  Customer,
  Expense,
  ExpenseCategory,
  Invoice,
  Page,
  Product,
  Purchase,
  ScanEvent,
  Store,
  Transaction,
} from "@my-store/shared-types";

import { assertData, getAdmin } from "./supabase";
import {
  categoryDTO,
  customerDTO,
  expenseDTO,
  invoiceDTO,
  pageDTO,
  productDTO,
  purchaseDTO,
  scanEventDTO,
  storeDTO,
  transactionDTO,
  type CategoryRow,
  type CustomerRow,
  type ExpenseRow,
  type InvoiceRow,
  type ProductRow,
  type PurchaseRow,
  type ScanRow,
  type StoreRow,
} from "./serialize";

export const PRODUCT_SELECT = `
  id, name, sku, barcode, description, cost_price, sale_price, stock, low_stock_threshold,
  category_id, store_id, created_at, updated_at,
  categories (id, name, slug, store_id, created_at, updated_at)
`;

export const INVOICE_SELECT = `
  id, number, status, customer_id, subtotal, discount, tax, total, paid_amount, note,
  store_id, created_by, issued_at, created_at, updated_at,
  customers (id, name, phone, address, note, balance, store_id, created_at, updated_at),
  invoice_items (
    id, invoice_id, product_id, qty, unit_price, total,
    products (
      id, name, sku, barcode, description, cost_price, sale_price, stock,
      low_stock_threshold, category_id, store_id, created_at, updated_at
    )
  ),
  payments (id, invoice_id, method, amount, note, created_at)
`;

const PURCHASE_SELECT = `
  id, number, supplier, total, paid_amount, note, store_id, created_by, created_at, updated_at,
  purchase_items (
    id, purchase_id, product_id, qty, unit_cost, total,
    products (
      id, name, sku, barcode, description, cost_price, sale_price, stock,
      low_stock_threshold, category_id, store_id, created_at, updated_at
    )
  )
`;

export function escapeIlike(value: string): string {
  return value.replace(/[%_,]/g, "").trim();
}

export async function getStore(storeId: string): Promise<Store | null> {
  const result = await getAdmin().from("stores").select("*").eq("id", storeId).maybeSingle();
  const row = assertData(result) as StoreRow | null;
  return row ? storeDTO(row) : null;
}

export async function listCategories(storeId: string): Promise<Category[]> {
  const result = await getAdmin()
    .from("categories")
    .select("*")
    .eq("store_id", storeId)
    .order("name");
  return (assertData(result) as CategoryRow[]).map(categoryDTO);
}

export interface ListProductsOptions {
  search?: string;
  categoryId?: string;
  lowStock?: boolean;
  outOfStock?: boolean;
  page?: number;
  pageSize?: number;
}

export async function listProducts(
  storeId: string,
  options: ListProductsOptions = {},
): Promise<Page<Product>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(500, Math.max(1, options.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = getAdmin()
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .eq("store_id", storeId);

  if (options.categoryId) query = query.eq("category_id", options.categoryId);
  if (options.lowStock) query = query.eq("is_low_stock", true);
  if (options.outOfStock) query = query.eq("stock", 0);
  const search = options.search ? escapeIlike(options.search) : "";
  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const result = await query.order("created_at", { ascending: false }).range(from, to);
  const rows = assertData(result) as unknown as ProductRow[];
  return pageDTO(rows.map((row) => productDTO(row)), result.count ?? rows.length, page, pageSize);
}

export async function listAllProducts(storeId: string): Promise<Product[]> {
  const page = await listProducts(storeId, { page: 1, pageSize: 500 });
  return page.items;
}

export async function getProduct(storeId: string, id: string): Promise<Product | null> {
  const result = await getAdmin()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();
  const row = assertData(result) as unknown as ProductRow | null;
  return row ? productDTO(row) : null;
}

export async function findProductByBarcode(storeId: string, barcode: string): Promise<Product | null> {
  const result = await getAdmin()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("store_id", storeId)
    .eq("barcode", barcode)
    .maybeSingle();
  const row = assertData(result) as unknown as ProductRow | null;
  return row ? productDTO(row) : null;
}

export async function listCustomers(storeId: string, search?: string): Promise<Customer[]> {
  let query = getAdmin().from("customers").select("*").eq("store_id", storeId);
  const q = search ? escapeIlike(search) : "";
  if (q) query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%,address.ilike.%${q}%`);
  const result = await query.order("created_at", { ascending: false }).limit(500);
  return (assertData(result) as CustomerRow[]).map(customerDTO);
}

export async function getCustomer(storeId: string, id: string): Promise<Customer | null> {
  const result = await getAdmin()
    .from("customers")
    .select("*")
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();
  const row = assertData(result) as CustomerRow | null;
  return row ? customerDTO(row) : null;
}

export interface ListInvoicesOptions {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  from?: Date;
  to?: Date;
}

export async function listInvoices(
  storeId: string,
  options: ListInvoicesOptions = {},
): Promise<Page<Invoice>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = getAdmin()
    .from("invoices")
    .select(INVOICE_SELECT, { count: "exact" })
    .eq("store_id", storeId);

  if (options.status) query = query.eq("status", options.status);
  if (options.from) query = query.gte("created_at", options.from.toISOString());
  if (options.to) query = query.lte("created_at", options.to.toISOString());

  const search = options.search ? escapeIlike(options.search) : "";
  if (search) {
    const customers = await getAdmin()
      .from("customers")
      .select("id")
      .eq("store_id", storeId)
      .or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    const ids = ((customers.data ?? []) as { id: string }[]).map((row) => row.id);
    if (ids.length > 0) {
      query = query.or(`number.ilike.%${search}%,customer_id.in.(${ids.join(",")})`);
    } else {
      query = query.ilike("number", `%${search}%`);
    }
  }

  const result = await query.order("created_at", { ascending: false }).range(from, to);
  const rows = assertData(result) as unknown as InvoiceRow[];
  return pageDTO(rows.map(invoiceDTO), result.count ?? rows.length, page, pageSize);
}

export async function getInvoice(storeId: string, id: string): Promise<Invoice | null> {
  const result = await getAdmin()
    .from("invoices")
    .select(INVOICE_SELECT)
    .eq("store_id", storeId)
    .eq("id", id)
    .maybeSingle();
  const row = assertData(result) as unknown as InvoiceRow | null;
  return row ? invoiceDTO(row) : null;
}

export async function listExpenses(
  storeId: string,
  options: { from?: Date; to?: Date; page?: number; pageSize?: number; search?: string } = {},
): Promise<Page<Expense>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 50));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = getAdmin()
    .from("expenses")
    .select("*, expense_categories(id, name, store_id)", { count: "exact" })
    .eq("store_id", storeId);
  if (options.from) query = query.gte("date", options.from.toISOString());
  if (options.to) query = query.lte("date", options.to.toISOString());
  const search = options.search ? escapeIlike(options.search) : "";
  if (search) query = query.ilike("title", `%${search}%`);

  const result = await query.order("date", { ascending: false }).range(from, to);
  const rows = assertData(result) as ExpenseRow[];
  return pageDTO(rows.map((row) => expenseDTO(row)), result.count ?? rows.length, page, pageSize);
}

export async function listAllExpenses(storeId: string, limit = 100): Promise<Expense[]> {
  const result = await listExpenses(storeId, { page: 1, pageSize: limit });
  return result.items;
}

export async function listExpenseCategories(storeId: string): Promise<ExpenseCategory[]> {
  const result = await getAdmin()
    .from("expense_categories")
    .select("id, name, store_id")
    .eq("store_id", storeId)
    .order("name");
  return (assertData(result) as { id: string; name: string; store_id: string }[]).map((row) => ({
    id: row.id,
    name: row.name,
    storeId: row.store_id,
  }));
}

export async function listPurchases(storeId: string): Promise<Purchase[]> {
  const result = await getAdmin()
    .from("purchases")
    .select(PURCHASE_SELECT)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (assertData(result) as unknown as PurchaseRow[]).map(purchaseDTO);
}

export async function listScanEvents(
  storeId: string,
  options: { page?: number; pageSize?: number } = {},
): Promise<Page<ScanEvent>> {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, options.pageSize ?? 30));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const result = await getAdmin()
    .from("scan_events")
    .select(
      `id, product_id, barcode, type, qty, device, note, user_id, store_id, created_at,
       products (id, name, barcode, sale_price, stock),
       profiles (name, email)`,
      { count: "exact" },
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = assertData(result) as unknown as ScanRow[];
  return pageDTO(rows.map(scanEventDTO), result.count ?? rows.length, page, pageSize);
}

export async function listLedger(
  storeId: string,
  options: { from?: Date; to?: Date; account?: string; limit?: number } = {},
): Promise<Transaction[]> {
  let query = getAdmin().from("ledger_entries").select("*").eq("store_id", storeId);
  if (options.from) query = query.gte("date", options.from.toISOString());
  if (options.to) query = query.lte("date", options.to.toISOString());
  if (options.account) query = query.eq("account", options.account);
  const result = await query.order("date", { ascending: false }).limit(options.limit ?? 200);
  return (assertData(result) as Parameters<typeof transactionDTO>[0][]).map(transactionDTO);
}

export interface MovementRow {
  id: string;
  product_id: string;
  type: string;
  qty: number;
  note: string | null;
  created_at: string;
  products?: { name: string } | { name: string }[] | null;
}

export async function listMovements(storeId: string, limit = 80) {
  const result = await getAdmin()
    .from("inventory_movements")
    .select("id, product_id, type, qty, note, created_at, products(name)")
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return assertData(result) as MovementRow[];
}

export async function listStaff(storeId: string) {
  const result = await getAdmin()
    .from("profiles")
    .select("id, name, email, role, active, created_at")
    .eq("store_id", storeId)
    .order("created_at");
  return assertData(result) as {
    id: string;
    name: string | null;
    email: string;
    role: "ADMIN" | "CASHIER";
    active: boolean;
    created_at: string;
  }[];
}
