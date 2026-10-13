// ============================================================
// کاتالوگ روی گوشی: کالاها + تنظیمات فروشگاه
//
// برای اینکه هر اسکن معطلِ اینترنت نشود، فهرست کالاها یک‌بار گرفته
// می‌شود و جست‌وجوی بارکد/نام روی خودِ گوشی انجام می‌گیرد.
// اگر بارکدی در حافظه نبود، همان لحظه از سرور پرسیده می‌شود.
// ============================================================

import * as React from "react";

import { apiGet, listProducts, lookupByBarcode } from "@my-store/api-client";
import { API_ROUTES, normalizeBarcode } from "@my-store/shared-utils";
import type { Product, Store } from "@my-store/shared-types";

export interface Catalog {
  products: Product[];
  store: Store | null;
  taxRate: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** جست‌وجوی محلی (نام یا بارکد) — بدون اینترنت */
  searchLocal: (query: string, limit?: number) => Product[];
  /** بارکد → کالا؛ اول حافظه، بعد سرور */
  findByBarcode: (barcode: string) => Promise<Product | null>;
}

export function useCatalog(): Catalog {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [store, setStore] = React.useState<Store | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [page, settings] = await Promise.all([
        listProducts({ pageSize: 500 }),
        apiGet<Store>(API_ROUTES.settings).catch(() => null),
      ]);
      setProducts(page.items);
      if (settings) setStore(settings);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "بارگذاری کالاها ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const index = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      const code = normalizeBarcode(product.barcode ?? "");
      if (code) map.set(code, product);
    }
    return map;
  }, [products]);

  const searchLocal = React.useCallback(
    (query: string, limit = 30) => {
      const q = query.trim().toLowerCase();
      if (!q) return products.slice(0, limit);
      return products
        .filter(
          (product) =>
            product.name.toLowerCase().includes(q) ||
            (product.sku ?? "").toLowerCase().includes(q) ||
            (product.barcode ?? "").includes(q),
        )
        .slice(0, limit);
    },
    [products],
  );

  const findByBarcode = React.useCallback(
    async (barcode: string) => {
      const code = normalizeBarcode(barcode);
      if (!code) return null;
      const cached = index.get(code);
      if (cached) return cached;
      try {
        const result = await lookupByBarcode(code);
        return result.found && result.product ? result.product : null;
      } catch {
        return null;
      }
    },
    [index],
  );

  return {
    products,
    store,
    taxRate: Number(store?.taxRate ?? 0),
    loading,
    error,
    refresh,
    searchLocal,
    findByBarcode,
  };
}
