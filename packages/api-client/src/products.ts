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

export function listCategories(): Promise<Category[]> {
  return apiGet(API_ROUTES.categories);
}

export function createCategory(input: CreateCategoryInput): Promise<Category> {
  return apiPost(API_ROUTES.categories, input);
}
