import { Minus, PackageSearch, Plus, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";
import type { CartLine } from "../lib/cart";

interface CartPanelProps {
  lines: CartLine[];
  onIncrease: (productId: string) => void;
  onDecrease: (productId: string) => void;
  onRemove: (productId: string) => void;
  onAddManually: () => void;
}

/** فهرست اقلام سبد — هر ردیف با دکمه‌های بزرگ لمسی. */
export function CartPanel({
  lines,
  onIncrease,
  onDecrease,
  onRemove,
  onAddManually,
}: CartPanelProps) {
  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
        <div className="bg-muted text-muted-foreground flex size-14 items-center justify-center rounded-2xl">
          <PackageSearch className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">سبد خالی است</p>
          <p className="text-muted-foreground mx-auto max-w-[16rem] text-xs leading-5">
            بارکد کالا را جلوی دوربین بگیرید؛ هر اسکن یک ردیف اینجا اضافه می‌شود.
            همه که جمع شد، «ثبت فاکتور» را بزنید.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onAddManually}>
          افزودن کالا بدون بارکد
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {lines.map((line) => {
        const short = line.stock < line.qty;
        return (
          <li key={line.productId} className="flex items-center gap-2 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{line.name}</p>
              <p className="text-muted-foreground flex items-center gap-2 text-[11px]">
                <span dir="ltr" className="truncate">
                  {line.barcode || "—"}
                </span>
                <span className="tnum">{formatCurrency(line.unitPrice)}</span>
              </p>
              {short ? (
                <p className="text-warning mt-0.5 flex items-center gap-1 text-[11px]">
                  <TriangleAlert className="size-3" />
                  موجودی انبار: {toPersianDigits(line.stock)}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-1 rounded-full border p-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                onClick={() => onIncrease(line.productId)}
                aria-label="افزودن یکی"
              >
                <Plus className="size-4" />
              </Button>
              <span className="tnum w-8 text-center text-base font-bold">
                {toPersianDigits(line.qty)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 rounded-full"
                onClick={() => onDecrease(line.productId)}
                aria-label="کم کردن یکی"
              >
                <Minus className="size-4" />
              </Button>
            </div>

            <div className="w-24 text-end">
              <p className="tnum text-sm font-semibold">
                {formatCurrency(line.qty * line.unitPrice)}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-destructive size-9"
              onClick={() => onRemove(line.productId)}
              aria-label="حذف از سبد"
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
