// ============================================================
// تبدیل داده‌ی روزانه‌ی فروش به سری کامل برای نمودار شادcn
//
// getDailySales فقط روزهایی را برمی‌گرداند که فاکتور دارند؛ برای نمودار
// به سری پیوسته (با صفر برای روزهای خالی) نیاز داریم.
// ============================================================

import type { DailySalesPoint } from "@my-store/shared-types";
import {
  addDaysToKey,
  daysBetweenKeys,
  formatDateJalali,
  storeDateTimeIso,
  storeDayKey,
  storeTodayKey,
} from "@my-store/shared-utils";

export interface SalesSeriesPoint {
  /** برچسب کوتاه محور افقی — مثلاً «۰۷/۱۵» */
  label: string;
  /** برچسب کامل — مثلاً «۱۴۰۵/۰۷/۱۵» */
  fullLabel: string;
  revenue: number;
  invoiceCount: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

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

  // کلید روزها به وقت فروشگاه ساخته می‌شوند تا با گروه‌بندی getDailySales یکی باشند
  const startKey = storeDayKey(from);
  const endKey = storeDayKey(to);
  const dayCount = daysBetweenKeys(startKey, endKey) + 1;

  if (dayCount <= 0) return [];
  if (dayCount > maxDays) return points.map((point) => toPoint(point.date));

  const series: SalesSeriesPoint[] = [];
  for (let index = 0; index < dayCount; index += 1) {
    series.push(toPoint(addDaysToKey(startKey, index)));
  }
  return series;
}

/**
 * ابتدای بازه‌ی n روز اخیر (شامل امروز)، بر مبنای نیمه‌شب فروشگاه.
 * قبلاً بر UTC بود؛ برای کابل یعنی نمودار «۷ روز» از ۴:۳۰ صبح شروع می‌شد.
 */
export function daysAgo(days: number, now = new Date()): Date {
  const today = storeTodayKey(now);
  return new Date(`${addDaysToKey(today, -(days - 1))}T00:00:00Z`);
}

/** همان بازه، ولی دقیقاً از نیمه‌شبِ فروشگاه (برای کوئری‌های دیتابیس). */
export function storeDaysAgo(days: number, now = new Date()): Date {
  const startKey = addDaysToKey(storeTodayKey(now), -(days - 1));
  return new Date(storeDateTimeIso(startKey));
}

export { DAY_MS };
