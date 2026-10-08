// ============================================================
// Formatters: currency (IRR / تومان, latin digits), dates (Jalali)
// ============================================================

/**
 * Format a money amount. Digits are always latin (en) for easy entry,
 * the currency label is appended in Persian.
 *
 * formatCurrency(123456) -> "123,456 تومان"
 */
export function formatCurrency(amount: number | string | null | undefined, currency = "IRR"): string {
  const value = Number(amount ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);

  const label = currency === "IRR" ? "تومان" : currency;
  return `${formatted} ${label}`;
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

/** Jalali (Shamsi) date, e.g. ۱۴۰۵/۰۷/۱۵ — via Intl (full-icu). */
export function formatDateJalali(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short" }).format(new Date(date));
  }
}

/** Jalali date + time, e.g. ۱۴۰۵/۰۷/۱۵ ۱۴:۳۲ */
export function formatDateTimeJalali(date: Date | string | number): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  } catch {
    return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(date),
    );
  }
}

/** Gregorian ISO-ish date for <input type="date"> values: YYYY-MM-DD */
export function toInputDate(date: Date | string | number = new Date()): string {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
