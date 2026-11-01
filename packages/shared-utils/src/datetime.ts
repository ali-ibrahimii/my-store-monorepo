// ============================================================
// منطقه‌ی زمانی و تقویم — تنها منبعِ حقیقت
//
// چرا مهم است: قبلاً «فروش امروز» و «درآمد این ماه» با ساعت سرور (UTC)
// و تقویم میلادی محاسبه می‌شد. برای فروشگاهی در کابل این یعنی:
//   • فروش ساعت ۱۲ شب تا ۳:۳۰ بامداد به «دیروز» می‌رفت،
//   • «این ماه» با ۱ ماهِ میلادی شروع می‌شد، نه ۱ ماهِ هجری شمسی.
// هر دو عدد داشبورد را غلط می‌کرد.
//
// حالا همه‌ی محاسبات از همین فایل می‌آید:
//   STORE_TIME_ZONE = Asia/Kabul   (UTC+4:30، بدون تغییر ساعت تابستانی)
//   STORE_LOCALE    = fa-AF        (نام ماه‌های افغانستان: حمل، ثور، جوزا …)
// ============================================================

/** منطقه‌ی زمانی فروشگاه — با متغیر محیطی STORE_TIME_ZONE قابل تغییر است. */
export const STORE_TIME_ZONE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_STORE_TIME_ZONE?.trim()) ||
  "Asia/Kabul";

/** لوکیل نمایش تاریخ (نام ماه‌ها به فارسی افغانستان). */
export const STORE_LOCALE =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_STORE_LOCALE?.trim()) || "fa-AF";

/** تقویم رسمی: هجری شمسی. */
export const STORE_CALENDAR = "persian";

/** لوکیل کامل Intl برای تقویم شمسی. */
export const STORE_DATE_LOCALE = `${STORE_LOCALE}-u-ca-${STORE_CALENDAR}`;

export interface ZonedParts {
  year: number;
  /** ۱ تا ۱۲ در تقویم میلادی */
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** اجزای تاریخ/ساعت یک لحظه در منطقه‌ی زمانی فروشگاه. */
export function zonedParts(date: Date = new Date()): ZonedParts {
  const parts = partsFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const hour = get("hour");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    // بعضی موتورها نیمه‌شب را 24 می‌دهند
    hour: hour === 24 ? 0 : hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** اختلاف منطقه‌ی زمانی با UTC بر حسب میلی‌ثانیه (در آن لحظه). */
export function zoneOffsetMs(date: Date = new Date()): number {
  const parts = zonedParts(date);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * تبدیل «ساعت دیواری فروشگاه» به لحظه‌ی UTC.
 * مثال: کابل، ۱۴۰۵/۰۸/۱۰ ساعت ۰۰:۰۰ → همان روز در UTC ۱۹:۳۰ روز قبل.
 */
function zonedWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const offset = zoneOffsetMs(guess);
  return new Date(guess.getTime() - offset);
}

/** ابتدای امروز (به وقت فروشگاه) به صورت لحظه‌ی UTC — مناسب مقایسه با timestamptz. */
export function startOfStoreDay(date: Date = new Date()): Date {
  const { year, month, day } = zonedParts(date);
  return zonedWallClockToUtc(year, month, day);
}

/** ابتدای فردا (به وقت فروشگاه). */
export function startOfNextStoreDay(date: Date = new Date()): Date {
  const start = startOfStoreDay(date);
  // دوازده ساعت جلو رفتن همیشه از مرز روز عبور می‌کند، حتی با منطقه‌های ±۱۴
  const { year, month, day } = zonedParts(new Date(start.getTime() + 12 * 60 * 60 * 1000));
  return zonedWallClockToUtc(year, month, day);
}

/**
 * ابتدای ماه جاری.
 *
 * ماه «حسابداری» همان ماه تقویم هجری شمسی است (۱ حمل تا آخر سنبله …)،
 * چون فروشگاه افغانستانی گزارش ماهانه را شمسی می‌خواهد.
 * تعداد روزهای ماه شمسی در نیمه‌ی اول سال ۳۱ و در نیمه‌ی دوم ۳۰ است
 * (اسفند/حوت در سال کبیسه ۳۰). پس مرز ماه با محاسبه‌ی روزهای آن ماه پیدا
 * می‌شود، نه با «۳۰ روز».
 */
export function startOfStoreMonth(date: Date = new Date()): Date {
  const { year, month, day } = zonedParts(date);
  // همان روز از ماه، ولی (day - 1) روز عقب‌تر → ابتدای ماه میلادیِ حاوی آن لحظه
  const shifted = new Date(Date.UTC(year, month - 1, day) - (day - 1) * 86_400_000);
  const firstOfGregorianMonth = {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
  // حالا «اول ماه شمسی» را با یک تقویم شمسی پیدا می‌کنیم
  const persian = persianParts(date);
  const gregorianOfPersianFirst = persianToGregorian(persian.year, persian.month, 1);
  if (gregorianOfPersianFirst) {
    return zonedWallClockToUtc(
      gregorianOfPersianFirst.year,
      gregorianOfPersianFirst.month,
      gregorianOfPersianFirst.day,
    );
  }
  return zonedWallClockToUtc(
    firstOfGregorianMonth.year,
    firstOfGregorianMonth.month,
    firstOfGregorianMonth.day,
  );
}

const persianPartsFormatter = new Intl.DateTimeFormat("en-US-u-ca-persian", {
  timeZone: STORE_TIME_ZONE,
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

/** اجزای تاریخ شمسی یک لحظه (به وقت فروشگاه). */
export function persianParts(date: Date = new Date()): { year: number; month: number; day: number } {
  const parts = persianPartsFormatter.formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** تبدیل تاریخ شمسی به میلادی (بدون کتابخانه‌ی بیرونی). */
export function persianToGregorian(
  jy: number,
  jm: number,
  jd: number,
): { year: number; month: number; day: number } | null {
  if (!Number.isFinite(jy) || !Number.isFinite(jm) || !Number.isFinite(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;

  // الگوریتم استاندارد تبدیل (بدون وابستگی)
  let gy = jy > 979 ? 1600 : 621;
  const jy2 = jy > 979 ? jy - 979 : jy;
  let days =
    365 * jy2 +
    Math.floor(jy2 / 33) * 8 +
    Math.floor(((jy2 % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 1; gm <= 12; gm++) {
    if (gd <= monthDays[gm]) break;
    gd -= monthDays[gm];
  }
  return { year: gy, month: gm, day: gd };
}

/** کلید روز به صورت YYYY-MM-DD در تقویم میلادی ولی به وقت فروشگاه (برای گروه‌بندی داده). */
export function storeDayKey(date: Date | string | number): string {
  const parts = zonedParts(new Date(date));
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

/**
 * افزودن n روز به یک کلید روز (YYYY-MM-DD) بدون اثر منطقه‌ی زمانی.
 * برای ساختن سری پیوسته‌ی نمودار استفاده می‌شود.
 */
export function addDaysToKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, (m ?? 1) - 1, (d ?? 1) + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

/** تعداد روز بین دو کلید روز. */
export function daysBetweenKeys(fromKey: string, toKey: string): number {
  const toUtc = (key: string) => {
    const [y, m, d] = key.split("-").map(Number);
    return Date.UTC(y, (m ?? 1) - 1, d ?? 1);
  };
  return Math.round((toUtc(toKey) - toUtc(fromKey)) / 86_400_000);
}

/** امروز به وقت فروشگاه، به صورت کلید روز. */
export function storeTodayKey(now: Date = new Date()): string {
  return storeDayKey(now);
}

/** یک تاریخ ISO کامل (با ساعت) از کلید روز و ساعت دیواری فروشگاه. */
export function storeDateTimeIso(dayKey: string, endOfDay = false): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const date = endOfDay
    ? zonedWallClockToUtc(y, m, d, 23, 59, 59)
    : zonedWallClockToUtc(y, m, d, 0, 0, 0);
  return date.toISOString();
}
