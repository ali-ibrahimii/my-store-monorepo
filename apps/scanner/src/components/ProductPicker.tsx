import { useMemo, useState } from "react";
import { PackageSearch, Plus, Search, X } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import { Input } from "@my-store/ui-kit/components/input";
import { formatCurrency, normalizeBarcode, toPersianDigits } from "@my-store/shared-utils";
import type { Product } from "@my-store/shared-types";

interface ProductPickerProps {
  /** بارکدی که در سیستم پیدا نشد (اگر از مسیر اسکن باز شده) */
  unknownBarcode?: string | null;
  search: (query: string, limit?: number) => Product[];
  onPick: (product: Product) => void;
  onClose: () => void;
}

/**
 * شیت «افزودن کالا»:
 *  • اگر بارکدی ناشناخته بود، همان را نشان می‌دهد
 *  • جست‌وجوی نام/بارکد روی خودِ گوشی (بدون اینترنت)
 *  • اگر متن ورودی خودش یک بارکد کامل باشد، همان لحظه اضافه می‌شود
 */
export function ProductPicker({ unknownBarcode, search, onPick, onClose }: ProductPickerProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => search(query, 40), [query, search]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" aria-label="بستن" className="flex-1" onClick={onClose} />
      <div className="sheet-up bg-background flex max-h-[88vh] flex-col rounded-t-3xl border-t shadow-2xl pb-safe">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <PackageSearch className="size-4" />
            <h2 className="text-base font-bold">افزودن کالا</h2>
          </div>
          <Button variant="ghost" size="icon" className="size-9" onClick={onClose} aria-label="بستن">
            <X className="size-5" />
          </Button>
        </header>

        {unknownBarcode ? (
          <p className="text-warning bg-warning/10 border-warning/30 border-b px-4 py-2 text-xs">
            بارکد <span dir="ltr" className="font-medium">{unknownBarcode}</span> در سیستم ثبت نشده
            است. کالا را از فهرست زیر انتخاب کنید یا اول در پنل وب ثبتش کنید.
          </p>
        ) : null}

        <div className="border-b p-3">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="نام کالا یا بارکد…"
              className="h-12 ps-9 text-base"
              inputMode="search"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {results.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              کالایی پیدا نشد. املای نام را بررسی کنید یا کالا را در پنل وب ثبت کنید.
            </p>
          ) : (
            <ul className="divide-y">
              {results.map((product) => {
                const code = normalizeBarcode(product.barcode ?? "");
                const matchesCode = code && normalizeBarcode(query) === code;
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => onPick(product)}
                      className="hover:bg-muted flex w-full items-center gap-3 rounded-xl px-2 py-3 text-start"
                    >
                      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <Plus className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{product.name}</span>
                        <span className="text-muted-foreground block truncate text-[11px]" dir="ltr">
                          {product.barcode || "—"}
                        </span>
                      </span>
                      <span className="text-end">
                        <span className="tnum block text-sm font-semibold">
                          {formatCurrency(product.salePrice)}
                        </span>
                        <span className="text-muted-foreground block text-[11px]">
                          موجودی {toPersianDigits(product.stock)}
                        </span>
                      </span>
                      {matchesCode ? (
                        <span className="bg-success/15 text-success rounded-full px-2 py-0.5 text-[10px]">
                          بارکد
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
