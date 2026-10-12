"use client";

// ============================================================
// <BarcodeLabel /> — یک برچسب آماده‌ی چاپ (نام + بارکد + قیمت)
//
// اندازه‌ها با میلی‌متر داده شده‌اند تا در چاپ درست بنشینند؛ EAN-13
// حداقل حدود ۳۴ میلی‌متر عرض لازم دارد تا اسکنر گوشی/دستگاهی آن را
// راحت بخواند — پس کوچک‌ترین اندازه هم از همان حد پایین‌تر نمی‌رود.
// ============================================================

import * as React from "react";

import { formatCurrency } from "@my-store/shared-utils";

import { cn } from "@/lib/utils";
import { BarcodeImage } from "./barcode-image";

export type LabelSize = "sm" | "md" | "lg";

export const LABEL_SIZES: Record<
  LabelSize,
  { title: string; hint: string; box: string; name: string; price: string; barcodeHeight: number }
> = {
  sm: {
    title: "کوچک",
    hint: "۳۴ × ۲۲ میلی‌متر",
    box: "w-[34mm] min-h-[22mm] p-[1.5mm]",
    name: "text-[7pt] leading-tight",
    price: "text-[8pt]",
    barcodeHeight: 28,
  },
  md: {
    title: "متوسط",
    hint: "۴۸ × ۳۰ میلی‌متر",
    box: "w-[48mm] min-h-[30mm] p-[2mm]",
    name: "text-[8pt] leading-tight",
    price: "text-[9pt]",
    barcodeHeight: 38,
  },
  lg: {
    title: "بزرگ",
    hint: "۶۳ × ۳۸ میلی‌متر",
    box: "w-[63mm] min-h-[38mm] p-[2.5mm]",
    name: "text-[10pt] leading-tight",
    price: "text-[11pt]",
    barcodeHeight: 50,
  },
};

export interface BarcodeLabelData {
  name: string;
  barcode: string;
  salePrice?: number;
  costPrice?: number;
  sku?: string | null;
  categoryName?: string | null;
}

export interface BarcodeLabelProps {
  data: BarcodeLabelData;
  size?: LabelSize;
  showName?: boolean;
  showPrice?: boolean;
  /** برچسبِ بدون محصول (کد تازه‌ساخته‌شده که هنوز روی کالایی نچسبیده) */
  placeholderName?: string;
  className?: string;
}

export function BarcodeLabel({
  data,
  size = "md",
  showName = true,
  showPrice = true,
  placeholderName = "بارکد بدون محصول",
  className,
}: BarcodeLabelProps) {
  const preset = LABEL_SIZES[size];
  const name = showName ? data.name.trim() || placeholderName : null;

  return (
    <div
      className={cn(
        "barcode-label bg-white text-black",
        "flex flex-col items-center justify-between gap-[1mm] overflow-hidden rounded-[1mm] border border-dashed border-neutral-300 text-center",
        preset.box,
        className,
      )}
    >
      {name ? (
        <div className={cn("w-full font-semibold", preset.name)} title={name}>
          {name}
        </div>
      ) : null}

      <BarcodeImage
        value={data.barcode}
        height={preset.barcodeHeight}
        moduleWidth={2}
        fontSize={12}
        responsive
        className="w-full"
      />

      {showPrice ? (
        <div className={cn("flex w-full items-center justify-between gap-1", preset.price)}>
          {data.salePrice !== undefined ? (
            <span className="font-bold">{formatCurrency(data.salePrice)}</span>
          ) : (
            <span dir="ltr" className="font-mono text-[9pt] tracking-wider">
              {data.barcode}
            </span>
          )}
          {data.sku ? (
            <span dir="ltr" className="text-[7pt] text-neutral-500">
              {data.sku}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** پیش‌نمایش ناحیه‌ی چاپ با چند برچسب تکراری */
export function LabelSheet({
  labels,
  size,
  showName,
  showPrice,
}: {
  labels: { key: string; data: BarcodeLabelData }[];
  size: LabelSize;
  showName: boolean;
  showPrice: boolean;
}) {
  return (
    <div className="print-area flex flex-wrap gap-[2mm]">
      {labels.map((label) => (
        <BarcodeLabel
          key={label.key}
          data={label.data}
          size={size}
          showName={showName}
          showPrice={showPrice}
        />
      ))}
    </div>
  );
}
