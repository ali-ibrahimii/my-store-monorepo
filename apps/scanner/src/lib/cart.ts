// ============================================================
// سبد فاکتور روی گوشی
//
// هر بارکد اسکن‌شده به این سبد اضافه می‌شود؛ سبد در localStorage
// می‌ماند تا اگر صفحه رفرش شد یا گوشی قفل شد، اقلام از دست نروند.
// با زدن «ثبت فاکتور» یک فاکتور واقعی ساخته می‌شود و سبد خالی می‌شود.
// ============================================================

import * as React from "react";
import type { Product } from "@my-store/shared-types";

export interface CartLine {
  productId: string;
  name: string;
  barcode: string;
  unitPrice: number;
  qty: number;
  stock: number;
  /** بارکد در جست‌وجو/افزودن دستی انتخاب شده (بدون اسکن) */
  manual?: boolean;
}

const STORAGE_PREFIX = "my-store.scanner.cart.v1";

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}.${userId}`;
}

function readCart(userId: string): CartLine[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((line) => line && typeof line.productId === "string" && line.qty > 0);
  } catch {
    return [];
  }
}

export interface CartTotals {
  count: number;
  subtotal: number;
  tax: number;
  total: number;
}

export function useCart(userId: string, taxRate: number) {
  const [lines, setLines] = React.useState<CartLine[]>(() => readCart(userId));

  // اگر کاربر عوض شد، سبد همان کاربر می‌آید
  React.useEffect(() => {
    setLines(readCart(userId));
  }, [userId]);

  React.useEffect(() => {
    try {
      localStorage.setItem(storageKey(userId), JSON.stringify(lines));
    } catch {
      // حافظه پر است — بی‌خیال
    }
  }, [lines, userId]);

  const addProduct = React.useCallback((product: Product | CartLine, qty = 1) => {
    const line: CartLine = "productId" in product && "unitPrice" in product
      ? { ...(product as CartLine), qty }
      : {
          productId: (product as Product).id,
          name: (product as Product).name,
          barcode: (product as Product).barcode ?? "",
          unitPrice: Number((product as Product).salePrice),
          qty,
          stock: Number((product as Product).stock),
        };

    setLines((prev) => {
      const index = prev.findIndex((row) => row.productId === line.productId);
      if (index === -1) return [...prev, line];
      const next = [...prev];
      next[index] = { ...next[index], qty: next[index].qty + qty };
      return next;
    });
  }, []);

  const setQty = React.useCallback((productId: string, qty: number) => {
    setLines((prev) =>
      prev
        .map((row) => (row.productId === productId ? { ...row, qty: Math.max(0, qty) } : row))
        .filter((row) => row.qty > 0),
    );
  }, []);

  const increase = React.useCallback(
    (productId: string) => setQty(productId, (find(lines, productId)?.qty ?? 0) + 1),
    [lines, setQty],
  );

  const decrease = React.useCallback(
    (productId: string) => setQty(productId, (find(lines, productId)?.qty ?? 0) - 1),
    [lines, setQty],
  );

  const remove = React.useCallback((productId: string) => {
    setLines((prev) => prev.filter((row) => row.productId !== productId));
  }, []);

  const clear = React.useCallback(() => setLines([]), []);

  const totals: CartTotals = React.useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.qty * line.unitPrice, 0);
    const tax = Math.round((subtotal * taxRate) / 100);
    return {
      count: lines.reduce((sum, line) => sum + line.qty, 0),
      subtotal,
      tax,
      total: subtotal + tax,
    };
  }, [lines, taxRate]);

  return { lines, addProduct, setQty, increase, decrease, remove, clear, totals };
}

function find(lines: CartLine[], productId: string): CartLine | undefined {
  return lines.find((line) => line.productId === productId);
}
