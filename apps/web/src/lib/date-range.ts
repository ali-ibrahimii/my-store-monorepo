import { startOfStoreMonth, storeDateTimeIso, storeTodayKey } from "@my-store/shared-utils";

/**
 * تفسیر بازه‌ی تاریخِ گزارش‌ها.
 *
 * ورودی‌ها از `<input type="date">` می‌آیند: «YYYY-MM-DD».
 * قبلاً کد `new Date(to + "T23:59:59.999Z")` می‌نوشت؛ یعنی پایان روز به
 * وقت UTC. برای کابل (+۴:۳۰) این یعنی گزارش تا ۴:۲۹ بامدادِ روز بعد را
 * شامل می‌شد و ابتدای بازه هم ۴:۳۰ ساعت عقب بود. حالا هر دو سر بازه با
 * ساعت فروشگاه ساخته می‌شوند.
 */
export interface StoreRange {
  /** لحظه‌ی UTC ابتدای بازه */
  from: Date;
  /** لحظه‌ی UTC پایان بازه (۲۳:۵۹:۵۹ همان روز به وقت فروشگاه) */
  to: Date;
  fromKey: string;
  toKey: string;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** کلید روز از یک پارامتر ورودی؛ ورودی نامعتبر → null */
export function parseDayKey(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!DATE_ONLY.test(raw)) return null;
  // اعتبارسنجی واقعی: 2026-02-31 نباید قبول شود
  const [y, m, d] = raw.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return null;
  }
  return raw;
}

/**
 * بازه‌ی «این ماه» بر اساس تقویم شمسی فروشگاه.
 * برای گزارش‌های بدون پارامتر استفاده می‌شود.
 */
export function defaultMonthRange(now = new Date()): StoreRange {
  const start = startOfStoreMonth(now);
  const toKey = storeTodayKey(now);
  const fromKey = storeTodayKey(start);
  return {
    from: new Date(storeDateTimeIso(fromKey)),
    to: new Date(storeDateTimeIso(toKey, true)),
    fromKey,
    toKey,
  };
}

/**
 * بازه از پارامترهای `from`/`to` (کلید روز میلادی، همان چیزی که
 * input[type=date] می‌دهد). پارامتر نامعتبر نادیده گرفته می‌شود.
 */
export function rangeFromParams(
  fromParam: string | null | undefined,
  toParam: string | null | undefined,
  now = new Date(),
): StoreRange {
  const fallback = defaultMonthRange(now);
  const fromKey = parseDayKey(fromParam) ?? fallback.fromKey;
  const toKey = parseDayKey(toParam) ?? fallback.toKey;
  return {
    from: new Date(storeDateTimeIso(fromKey)),
    to: new Date(storeDateTimeIso(toKey, true)),
    fromKey,
    toKey,
  };
}

/** «YYYY-MM-DD» امروز به وقت فروشگاه (پیش‌فرض input تاریخ در فرم‌ها). */
export function todayInputValue(): string {
  return storeTodayKey();
}
