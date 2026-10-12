// ============================================================
// تبدیل داده‌ی روزانه‌ی فروش به سری کامل برای نمودار شادcn
//
// getDailySales فقط روزهایی را برمی‌گرداند که فاکتور دارند؛ برای نمودار
// به سری پیوسته (با صفر برای روزهای خالی) نیاز داریم.
// ============================================================

import type { DailySalesPoint } from "@my-store/shared-types";
import { formatDateJalali } from "@my-store/shared-utils";

export interface SalesSeriesPoint {
  /** برچسب کوتاه محور افقی — مثلاً «۰۷/۱۵» */
  label: string;
  /** برچسب کامل — مثلاً «۱۴۰۵/۰۷/۱۵» */
  fullLabel: string;
  revenue: number;
  invoiceCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/**
 * سری پیوسته‌ی فروش از `from` تا `to`.
 * اگر بازه بزرگ‌تر از `maxDays` باشد، فقط روزهای دارای فروش برگردانده می‌شوند
 * تا نمودار خوانا بماند.
 */
export function buildSalesSeries(
  points: DailySalesPoint[],
  from: Date,
  to: Date,
  maxDays = 62,
): SalesSeriesPoint[] {
  const map = new Map(points.map((point) => [point.date, point]));

  const toPoint = (dateKey: string): SalesSeriesPoint => ({
    label: formatDateJalali(dateKey).split("/").slice(1).join("/"),
    fullLabel: formatDateJalali(dateKey),
    revenue: map.get(dateKey)?.revenue ?? 0,
    invoiceCount: map.get(dateKey)?.invoiceCount ?? 0,
  });

  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  const dayCount = Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;

  if (dayCount <= 0) return [];
  if (dayCount > maxDays) return points.map((point) => toPoint(point.date));

  const series: SalesSeriesPoint[] = [];
  for (let index = 0; index < dayCount; index += 1) {
    const day = new Date(start.getTime() + index * DAY_MS);
    series.push(toPoint(day.toISOString().slice(0, 10)));
  }
  return series;
}

/** ابتدای بازه‌ی n روز اخیر (شامل امروز)، بر مبنای UTC. */
export function daysAgo(days: number, now = new Date()): Date {
  return new Date(startOfUtcDay(now).getTime() - (days - 1) * DAY_MS);
}
