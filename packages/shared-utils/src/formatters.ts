import { STORE_DATE_LOCALE, STORE_TIME_ZONE, storeDayKey } from "./datetime";

// ============================================================
// Formatters: currency (AFN / افغانی), numbers, dates (Jalali)
//
// ارز پیش‌فرض: افغانی (AFN).
//  • برچسب کوتاه: افغانی
//  • رده‌های پولی افغانستان: سکه‌های ۱، ۲، ۵ افغانی و اسکناس‌های ۱۰ تا ۱۰۰۰؛
//    چون تورم بالا بوده، مبالغ معمولاً به هزار (هزار افغانی) گفته می‌شوند —
//    برای همین «خلاصه‌ی خوانا» (compact) هم داریم: ۱٫۲ میلیون، ۴۵۰ هزار.
// ============================================================

/** برچسب ارزهای رایج در سیستم. */
export const CURRENCY_LABELS: Record<string, string> = {
  AFN: "افغانی",
  IRR: "تومان",
  USD: "دالر",
  PKR: "کلدار",
};

/**
 * Format a money amount. Digits are always latin (en) for easy entry,
 * the currency label is appended in Persian/Dari.
 *
 * formatCurrency(123456)          -> "123,456 افغانی"
 * formatCurrency(123456, "USD")   -> "123,456 دالر"
 */
export function formatCurrency(amount: number | string | null | undefined, currency = "AFN"): string {
  const value = Number(amount ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  const label = CURRENCY_LABELS[currency?.toUpperCase?.() ?? "AFN"] ?? currency ?? "افغانی";
  return `${formatted} ${label}`;
}

/**
 * مبلغ خوانا و کوتاه — مناسب کارت‌های داشبورد روی موبایل:
 *   ۱٬۲۳۴٬۵۶۷ → "۱٫۲۳ میلیون افغانی"
 *   ۴۵۰٬۰۰۰   → "۴۵۰ هزار افغانی"
 *   ۹۵٬۰۰۰    → "95,000 افغانی"
 */
export function formatCurrencyShort(
  amount: number | string | null | undefined,
  currency = "AFN",
): string {
  const value = Number(amount ?? 0);
  const label = CURRENCY_LABELS[currency?.toUpperCase?.() ?? "AFN"] ?? currency ?? "افغانی";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value / 1_000_000)} میلیون ${label}`;
  }
  if (abs >= 100_000) {
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value / 1_000)} هزار ${label}`;
  }
  return formatCurrency(value, currency);
}

/** Compact currency, e.g. 12,345 — no currency label. */
export function formatNumber(amount: number | string | null | undefined): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(Number(amount ?? 0));
}

/** Convert latin digits of a string to Persian digits. */
export function toPersianDigits(input: string | number): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(input).replace(/[0-9]/g, (d) => fa[Number(d)]);
}

/**
 * تاریخ شمسی — «۱۴۰۵/۰۸/۱۰».
 *
 * منطقه‌ی زمانی و لوکیل از `datetime.ts` می‌آید (Asia/Kabul + fa-AF)، پس
 * تاریخ درست حتی وقتی سرور UTC است هم نمایش داده می‌شود. ماه‌ها با نام
 * افغانستانی (حمل، ثور، جوزا …) در `formatDateJalaliLong` می‌آیند.
 */
export function formatDateJalali(date: Date | string | number): string {
  const formatter = new Intl.DateTimeFormat(STORE_DATE_LOCALE, {
    timeZone: STORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  try {
    return formatter.format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(new Date(date));
  }
}

/** تاریخ شمسی با نام ماه — «۱۰ عقرب ۱۴۰۵» */
export function formatDateJalaliLong(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(STORE_DATE_LOCALE, {
      timeZone: STORE_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(new Date(date));
  } catch {
    return formatDateJalali(date);
  }
}

/** تاریخ + ساعت شمسی — «۱۴۰۵/۰۸/۱۰ ۱۴:۳۲» */
export function formatDateTimeJalali(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat(STORE_DATE_LOCALE, {
      timeZone: STORE_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat("en", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(date),
    );
  }
}

/** تاریخ میلادی برای <input type="date"> — به وقت فروشگاه (نه UTC سرور). */
export function toInputDate(date: Date | string | number = new Date()): string {
  return storeDayKey(new Date(date));
}

/** Relative-ish "x minutes ago" in Persian (simple). */
export function timeAgo(date: Date | string | number): string {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "همین الان";
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه پیش`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${toPersianDigits(hours)} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${toPersianDigits(days)} روز پیش`;
}
