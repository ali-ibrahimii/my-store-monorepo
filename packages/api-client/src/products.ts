// ============================================================
// Products & categories API
// ============================================================

import type {
  Category,
  CreateCategoryInput,
  CreateProductInput,
  Page,
  Product,
  UpdateProductInput,
} from "@my-store/shared-types";
import { API_ROUTES } from "@my-store/shared-utils";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";

export function listProducts(query?: {
  search?: string;
  categoryId?: string;
  page?: number;
  pageSize?: number;
  lowStock?: boolean;
}): Promise<Page<Product>> {
  return apiGet(API_ROUTES.products, {
    search: query?.search,
    categoryId: query?.categoryId,
    page: query?.page,
    pageSize: query?.pageSize,
    lowStock: query?.lowStock,
  });
}

export function getProduct(id: string): Promise<Product> {
  return apiGet(`${API_ROUTES.products}/${id}`);
}

export function createProduct(input: CreateProductInput): Promise<Product> {
  return apiPost(API_ROUTES.products, input);
}

export function updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
  return apiPatch(`${API_ROUTES.products}/${id}`, input);
}

export function deleteProduct(id: string): Promise<{ ok: true }> {
  return apiDelete(`${API_ROUTES.products}/${id}`);
}

/** Look up a product by barcode — used by the scanner. */
export function lookupByBarcode(barcode: string): Promise<{
  found: boolean;
  product?: Product;
}> {
  return apiGet(API_ROUTES.productLookup, { barcode });
}

// ------------------------------------------------------------
// بارکدها — ساخت و ثبت روی محصولات (تب «بارکدها» در وب)
// ------------------------------------------------------------

/** چند بارکد EAN-13 تازه بساز (فقط نمایش/چاپ — هنوز روی محصولی ثبت نشده) */
export function generateBarcodes(input: {
  count: number;
  prefix?: string;
}): Promise<{ codes: string[] }> {
  return apiPost(API_ROUTES.barcodes, { action: "generate", ...input });
}

/** برای محصولات بدون بارکد، خودکار بساز و ثبت کن */
export function fillMissingBarcodes(productIds?: string[]): Promise<BarcodeAssignResult> {
  return apiPost(API_ROUTES.barcodes, { action: "fill-missing", productIds });
}

/** بارکدها را روی محصولات بگذار (بارکد خالی = خودت بساز) */
export function assignBarcodes(
  items: { productId: string; barcode?: string }[],
): Promise<BarcodeAssignResult> {
  return apiPost(API_ROUTES.barcodes, { action: "assign", items });
}

export interface BarcodeAssignResult {
  assigned: { productId: string; barcode: string }[];
  failed: { productId: string; error?: string }[];
}

export function listCategories(): Promise<Category[]> {
  return apiGet(API_ROUTES.categories);
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiPost(API_ROUTES.categories, input);
}
