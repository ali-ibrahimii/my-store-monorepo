"use client";

// ============================================================
// <BarcodeImage /> — نمایش یک بارکد به‌صورت SVG (قابل چاپ)
//
// چرا JsBarcode؟
//   رمزگذاری EAN-13/EAN-8/UPC/Code128 ساده نیست (جدول‌های رمزگذاری و
//   رقم کنترلی). این کتابخانه در مرورگر همان چیزی را می‌سازد که
//   اسکنرهای واقعی می‌خوانند؛ ما فقط خروجی SVG را «واکنش‌گرا» می‌کنیم تا
//   داخل برچسب‌های چاپی هر اندازه‌ای درست بنشیند.
//
// نکته‌ی پیاده‌سازی: حالت خطا در استیت نگه داشته نمی‌شود، چون اعتبارِ کد
// کاملاً «قابل محاسبه» است (خالی بودن یا نبودن کاراکترهای مجاز) و باقی
// کارها همان درج در DOM است — کمترین رندر و بدون حلقه‌ی استیت.
// ============================================================

import * as React from "react";

import JsBarcode from "jsbarcode";
import {
  isValidCode128,
  isValidEan13,
  isValidEan8,
  isValidUpcA,
} from "@my-store/shared-utils";

import { cn } from "@/lib/utils";

type SupportedFormat = "EAN13" | "EAN8" | "UPC" | "CODE128";

/** نزدیک‌ترین قالب استانداردی که این کد را می‌تواند نشان دهد. */
export function pickBarcodeFormat(value: string): SupportedFormat {
  if (isValidEan13(value)) return "EAN13";
  if (isValidEan8(value)) return "EAN8";
  if (isValidUpcA(value)) return "UPC";
  return "CODE128";
}

export interface BarcodeImageProps {
  value: string;
  /** ارتفاع میله‌ها (px) */
  height?: number;
  /** ضخامت هر ماژول (px) */
  moduleWidth?: number;
  fontSize?: number;
  /** نمایش رقم‌ها زیر بارکد */
  displayValue?: boolean;
  /** کشیده‌شدن به عرض ظرف (برای برچسب‌های چاپی) */
  responsive?: boolean;
  className?: string;
}

export function BarcodeImage({
  value,
  height = 60,
  moduleWidth = 2,
  fontSize = 14,
  displayValue = true,
  responsive = false,
  className,
}: BarcodeImageProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const fallbackRef = React.useRef<HTMLDivElement>(null);

  const code = value.trim();
  const format = pickBarcodeFormat(code);

  // پیام‌هایی که از روی خود مقدار قابل تشخیص‌اند (بدون رندر/اثر)
  const problem = !code
    ? "بارکدی ثبت نشده"
    : format === "CODE128" && !isValidCode128(code)
      ? "این کد را نمی‌توان به‌صورت بارکد چاپ کرد"
      : null;

  const flat = format !== "CODE128";

  React.useEffect(() => {
    const svg = svgRef.current;
    const fallback = fallbackRef.current;
    if (!svg || !fallback) return;

    // پاک‌کردن رندر قبلی (تغییر مقدار → رندر تازه)
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.removeAttribute("viewBox");
    svg.style.width = "";
    svg.style.height = "";
    svg.style.display = "";
    fallback.textContent = "";
    fallback.classList.add("hidden");

    if (problem) {
      svg.style.display = "none";
      fallback.classList.remove("hidden");
      fallback.textContent = problem;
      return;
    }

    try {
      JsBarcode(svg, code, {
        format,
        height,
        width: moduleWidth,
        fontSize,
        displayValue,
        // EAN: میله‌های کوتاه‌تر (استاندارد برچسب فروشگاهی)
        flat,
        margin: displayValue ? 4 : 0,
        background: "#ffffff",
        lineColor: "#000000",
      });

      if (responsive) {
        // SVGِ JsBarcode عرض/ارتفاع ثابت دارد و viewBox ندارد؛ با تنظیم
        // viewBox آن را مقیاس‌پذیر می‌کنیم تا در هر برچسبی صاف چاپ شود.
        const width = parseFloat(svg.getAttribute("width") ?? "0");
        const svgHeight = parseFloat(svg.getAttribute("height") ?? "0");
        if (width > 0 && svgHeight > 0) {
          svg.setAttribute("viewBox", `0 0 ${width} ${svgHeight}`);
          svg.removeAttribute("width");
          svg.removeAttribute("height");
          svg.style.width = "100%";
          svg.style.height = "auto";
        }
      }
    } catch (cause) {
      svg.style.display = "none";
      fallback.classList.remove("hidden");
      fallback.textContent =
        cause instanceof Error ? cause.message : "نمایش این بارکد ممکن نشد";
      console.warn("[barcode] render failed:", cause);
    }
  }, [code, format, flat, problem, height, moduleWidth, fontSize, displayValue, responsive]);

  return (
    <div className={cn("flex w-full flex-col items-center gap-1", className)}>
      <svg ref={svgRef} role="img" aria-label={code ? `بارکد ${code}` : "بارکد"} />
      <div
        ref={fallbackRef}
        dir="ltr"
        className="text-destructive border-destructive/40 bg-destructive/5 hidden w-full rounded-md border border-dashed px-2 py-3 text-center font-mono text-xs"
      />
    </div>
  );
}
