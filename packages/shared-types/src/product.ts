// ============================================================
// Catalog types: Product, Category, Inventory
// ============================================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  /** EAN-13 / UPC-A / Code128 — normalized */
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
  category?: Category | null;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  barcode: string;
  sku?: string;
  description?: string;
  costPrice: number;
  salePrice: number;
  stock?: number;
  lowStockThreshold?: number;
  categoryId?: string;
}

export type UpdateProductInput = Partial<CreateProductInput>;

export const MOVEMENT_TYPES = [
  "PURCHASE",
  "SALE",
  "ADJUSTMENT",
  "SCAN_IN",
  "SCAN_OUT",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface InventoryMovement {
  id: string;
  productId: string;
  type: MovementType;
  /** positive: into stock, negative: out of stock */
  qty: number;
  refType: string | null;
  refId: string | null;
  note: string | null;
  createdAt: string;
}

export interface CreateCategoryInput {
  name: string;
  slug?: string;
}

/** Paginated list envelope used by all list APIs. */
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
