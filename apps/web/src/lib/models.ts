// ============================================================
// MongoDB document models (my-store)
//
// هر «مدل» اینجا = یک «کالکشن» در MongoDB.
// کلید اصلی همه‌ی داکیومنت‌ها `_id` از نوع ObjectId است و
// رابطه‌ها با ObjectId به‌صورت «manual reference» نگه داشته می‌شوند.
//
// نکته‌ی مهم طراحی:
//   - چیزهایی که همیشه با هم خوانده/نوشته می‌شوند «embed» شده‌اند
//     (مثلاً آیتم‌ها و پرداخت‌های یک فاکتور داخل خود فاکتور).
//   - چیزهایی که هویت مستقل دارند «reference» شده‌اند
//     (محصول، مشتری، کاربر، فروشگاه).
//
// قرارداد id در این پروژه:
//   - `_id` هر داکیومنت یک ObjectId واقعی است (استاندارد MongoDB).
//   - «ارجاع‌ها» (storeId، productId، …) به‌صورت رشته‌ی hex همان
//     ObjectId ذخیره می‌شوند. این کار هم خوانا است، هم در JSON
//     دست‌نخورده می‌ماند و هم مقایسه‌ی رشته‌ها در کوئری سریع و ساده است.
//     وقتی بخواهیم با `_id` کوئری بزنیم، رشته را با `oid()` به
//     ObjectId تبدیل می‌کنیم.
// ============================================================

import type { ObjectId } from "mongodb";
import type {
  InvoiceStatus,
  LedgerAccount,
  LedgerType,
  MovementType,
  PaymentMethod,
  Role,
  ScanType,
} from "@my-store/shared-types";

// ------------------------------------------------------------
// Auth & Store
// ------------------------------------------------------------

export interface StoreDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserDoc {
  _id: ObjectId;
  name: string | null;
  /** lowercase + trimmed — یکتا در کل سیستم */
  email: string;
  emailVerified: Date | null;
  passwordHash: string | null;
  role: Role;
  /** hex string از ObjectId فروشگاه */
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------------------------------------
// Catalog
// ------------------------------------------------------------

export interface CategoryDoc {
  _id: ObjectId;
  name: string;
  slug: string;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductDoc {
  _id: ObjectId;
  name: string;
  sku: string | null;
  /** EAN-13 / UPC-A / Code128 — نرمال‌شده */
  barcode: string;
  description: string | null;
  /** قیمت خرید */
  costPrice: number;
  /** قیمت فروش */
  salePrice: number;
  /** موجودی فعلی انبار */
  stock: number;
  lowStockThreshold: number;
  categoryId: string | null;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------------------------------------
// Inventory
// ------------------------------------------------------------

export interface InventoryMovementDoc {
  _id: ObjectId;
  productId: string;
  type: MovementType;
  /** مثبت: ورود به انبار، منفی: خروج */
  qty: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: Date;
}

// ------------------------------------------------------------
// Parties (طرف حساب)
// ------------------------------------------------------------

export interface CustomerDoc {
  _id: ObjectId;
  name: string;
  phone: string | null;
  address: string | null;
  /** مثبت: مشتری به ما بدهکار است */
  balance: number;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------------------------------------
// Sales — فاکتور فروش (items و payments به‌صورت embedded)
// ------------------------------------------------------------

export interface InvoiceItemDoc {
  /**
   * هر آیتم embedded هم شناسه‌ی خودش را دارد (برای کلید یکتا در UI).
   * به‌صورت رشته‌ی hex ذخیره می‌شود — همان قرارداد ارجاع‌ها.
   */
  _id: string;
  productId: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PaymentDoc {
  _id: string;
  method: PaymentMethod;
  amount: number;
  note: string | null;
  createdAt: Date;
}

export interface InvoiceDoc {
  _id: ObjectId;
  /** INV-0001 */
  number: string;
  status: InvoiceStatus;
  customerId: string | null;
  items: InvoiceItemDoc[];
  payments: PaymentDoc[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  note: string | null;
  storeId: string;
  createdById: string;
  issuedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ------------------------------------------------------------
// Expenses — هزینه‌ها
// ------------------------------------------------------------

export interface ExpenseCategoryDoc {
  _id: ObjectId;
  name: string;
  storeId: string;
}

export interface ExpenseDoc {
  _id: ObjectId;
  title: string;
  amount: number;
  date: Date;
  note: string | null;
  receiptUrl: string | null;
  categoryId: string | null;
  storeId: string;
  createdById: string;
  createdAt: Date;
}

// ------------------------------------------------------------
// Ledger — دفتر کل (double-entry)
// ------------------------------------------------------------

export interface TransactionDoc {
  _id: ObjectId;
  date: Date;
  account: LedgerAccount;
  type: LedgerType;
  amount: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  storeId: string;
  createdAt: Date;
}

// ------------------------------------------------------------
// Scanner — اسکن محصول (real-time)
// ------------------------------------------------------------

export interface ScanEventDoc {
  _id: ObjectId;
  productId: string | null;
  /** بارکد اسکن‌شده (ممکن است محصول ثبت نشده باشد) */
  barcode: string;
  type: ScanType;
  qty: number;
  device: string | null;
  note: string | null;
  userId: string | null;
  storeId: string;
  createdAt: Date;
}

// ------------------------------------------------------------
// شمارنده‌ی شماره فاکتور (اتمیک با findOneAndUpdate + $inc)
// ------------------------------------------------------------

export interface CounterDoc {
  /** `${storeId}:${kind}` */
  _id: string;
  seq: number;
}

// ------------------------------------------------------------
// نقشه‌ی نام کالکشن‌ها
// ------------------------------------------------------------

export const COLLECTIONS = {
  stores: "stores",
  users: "users",
  categories: "categories",
  products: "products",
  customers: "customers",
  invoices: "invoices",
  expenseCategories: "expense_categories",
  expenses: "expenses",
  transactions: "transactions",
  inventoryMovements: "inventory_movements",
  scanEvents: "scan_events",
  counters: "counters",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
