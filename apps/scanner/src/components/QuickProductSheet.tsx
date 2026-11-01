import { useState, type FormEvent } from "react";
import { PackagePlus, X } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";
import { Input } from "@my-store/ui-kit/components/input";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { createProduct } from "@my-store/api-client";
import { formatCurrency } from "@my-store/shared-utils";
import type { Product } from "@my-store/shared-types";

interface QuickProductSheetProps {
  /** بارکدی که اسکن شد ولی در سیستم نبود */
  barcode: string;
  onCreated: (product: Product) => void;
  onClose: () => void;
}

/**
 * «کالای جدید» — ثبت سریع کالای ناشناخته از خود گوشی.
 *
 * چرا این لازم است: در بازار، بخش زیادی از جنس‌ها بارکد کارخانه‌ای دارند
 * ولی در سیستم ثبت نشده‌اند. قبلاً تنها راه این بود که صندوق‌دار گوشی را
 * بگذارد و از پنل وب ثبت کند، بعد دوباره اسکن کند. حالا همان‌جا:
 * بارکد (از قبل پر شده) + نام + قیمت فروش → کالا ساخته و به سبد اضافه می‌شود.
 *
 * بهای خرید عمداً گرفته نمی‌شود (صندوق‌دار تعیینش نمی‌کند) و موجودی اولیه
 * صفر است؛ ورود جنس باید از مسیر «خرید» یا «حرکت انبار» ثبت شود.
 */
export function QuickProductSheet({ barcode, onCreated, onClose }: QuickProductSheetProps) {
  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const price = Number(salePrice.replace(/[^\d]/g, ""));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      setError("نام کالا را کامل وارد کنید");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("قیمت فروش را وارد کنید");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const product = await createProduct({
        name: name.trim(),
        barcode,
        salePrice: price,
        costPrice: 0,
        stock: 0,
      });
      onCreated(product);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ثبت کالا ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm">
      <button type="button" aria-label="بستن" className="flex-1" onClick={onClose} />
      <form
        onSubmit={onSubmit}
        className="sheet-up bg-background flex flex-col gap-4 rounded-t-3xl border-t p-4 pb-safe shadow-2xl"
      >
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="size-4" />
            <h2 className="text-base font-bold">کالای جدید</h2>
          </div>
          <Button variant="ghost" size="icon" type="button" className="size-9" onClick={onClose} aria-label="بستن">
            <X className="size-5" />
          </Button>
        </header>

        <div className="bg-muted/60 rounded-xl px-3 py-2 text-xs">
          بارکد: <span dir="ltr" className="font-medium">{barcode}</span>
          {/* بارکد کارخانه‌ای همان‌طور که هست ثبت می‌شود؛ کد ساختگی ساخته نمی‌شود */}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="qp-name" className="text-sm font-medium">
            نام کالا
          </label>
          <Input
            id="qp-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="مثلاً: روغن آفتابگردان ۱ لیتری"
            className="h-12 text-base"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="qp-price" className="text-sm font-medium">
            قیمت فروش (افغانی)
          </label>
          <Input
            id="qp-price"
            inputMode="numeric"
            dir="ltr"
            value={salePrice}
            onChange={(event) => setSalePrice(event.target.value)}
            placeholder="0"
            className="tnum h-12 text-base"
            required
          />
          {price > 0 ? (
            <p className="text-muted-foreground text-[11px]">{formatCurrency(price)}</p>
          ) : null}
        </div>

        {error ? <p className="text-destructive text-xs">{error}</p> : null}

        <Button type="submit" disabled={busy} className="h-14 w-full text-base font-semibold">
          {busy ? <Spinner /> : <PackagePlus className="size-5" />}
          {busy ? "در حال ثبت…" : "ثبت کالا و افزودن به سبد"}
        </Button>
        <p className="text-muted-foreground text-center text-[11px] leading-5">
          موجودی اولیه صفر ثبت می‌شود. ورود جنس را بعداً از «خرید کالا» ثبت کنید تا بهای تمام‌شده و سود درست بماند.
        </p>
      </form>
    </div>
  );
}
