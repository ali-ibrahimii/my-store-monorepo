// ============================================================
// Barcode utilities: normalize, validate (EAN-13/8, UPC-A, Code128)
// Works in browser, Node and React Native (no dependencies).
// ============================================================

/** Remove spaces, dashes and other separators; keep digits/letters. */
export function normalizeBarcode(raw: string): string {
  return String(raw ?? "")
    .trim()
    .replace(/[\s-]/g, "")
    .toUpperCase();
}

/** EAN-13 / EAN-8 check digit (GS1 standard). */
export function gsanCheckDigit(digits: string): number {
  const body = digits.slice(0, -1);
  let sum = 0;
  // From the rightmost digit of the body, weights alternate 3,1,3,1...
  for (let i = body.length - 1, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    const d = body.charCodeAt(i) - 48;
    if (d < 0 || d > 9) return -1;
    sum += d * weight;
  }
  return (10 - (sum % 10)) % 10;
}

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  return gsanCheckDigit(code) === Number(code[12]);
}

export function isValidEan8(code: string): boolean {
  if (!/^\d{8}$/.test(code)) return false;
  return gsanCheckDigit(code) === Number(code[7]);
}

export function isValidUpcA(code: string): boolean {
  if (!/^\d{12}$/.test(code)) return false;
  return gsanCheckDigit(code) === Number(code[11]);
}

/** Convert a 12-digit UPC-A to its 13-digit EAN-13 equivalent. */
export function upcAToEan13(upc: string): string | null {
  if (!isValidUpcA(upc)) return null;
  return `0${upc}`;
}

/** Code128: 1-48 printable ASCII characters. */
export function isValidCode128(code: string): boolean {
  return code.length >= 1 && code.length <= 48 && /^[\x20-\x7E]+$/.test(code);
}

export type BarcodeFormat = "EAN13" | "EAN8" | "UPCA" | "CODE128" | "UNKNOWN";

export function detectBarcodeFormat(code: string): BarcodeFormat {
  if (isValidEan13(code)) return "EAN13";
  if (isValidEan8(code)) return "EAN8";
  if (isValidUpcA(code)) return "UPCA";
  if (isValidCode128(code)) return "CODE128";
  return "UNKNOWN";
}

/**
 * Normalize a scanned code for product lookup.
 * - UPC-A (12 digits) is converted to EAN-13, since most product databases
 *   key on EAN-13.
 * - Returns null when the code is not a recognizable barcode.
 */
export function normalizeForLookup(raw: string): string | null {
  const code = normalizeBarcode(raw);
  if (!code) return null;
  if (isValidEan13(code)) return code;
  if (isValidEan8(code)) return code;
  if (isValidUpcA(code)) return upcAToEan13(code);
  if (isValidCode128(code)) return code;
  return null;
}

// ============================================================
// تولید بارکد (Barcode generation)
//
// فروشگاه‌های کوچک معمولاً بارکد آماده‌ی محصولات فله/بسته‌بندی‌شده‌ی خودشان را
// ندارند. این‌جا یک EAN-13 استاندارد و «معتبر» می‌سازیم که:
//   - رقم کنترلی‌اش درست است (اسکنر واقعی آن را می‌خواند)،
//   - با پیشوند ۶۲۸ (کد کشور ایران در GS1) شروع می‌شود،
//   - سه رقم بعدی «کد فروشگاه» است تا بارکدهای هر فروشگاه قابل تفکیک باشند.
//
// ساختار ۱۳ رقمی: ۶۲۸ + کد فروشگاه (۳ رقم) + سریال کالا (۶ رقم) + رقم کنترلی
// ============================================================

/** پیشوند GS1 ایران (کد کشور) */
export const GS1_IRAN_PREFIX = "628";

/** فقط رقم‌ها را نگه می‌دارد و به طول دلخواه می‌برد/pad می‌کند */
function digitsOnly(raw: unknown, length: number): string {
  return String(raw ?? "")
    .replace(/\D/g, "")
    .slice(0, length)
    .padStart(length, "0");
}

/** ۱۲ رقم بدنه‌ی EAN-13 را به کد کامل ۱۳ رقمی (با رقم کنترلی) تبدیل می‌کند. */
export function ean13WithCheckDigit(body12: string): string {
  const body = digitsOnly(body12, 12);
  return `${body}${gsanCheckDigit(`${body}0`)}`;
}

/** کد سه‌رقمی پایدار برای هر فروشگاه (۱۰۰ تا ۹۹۹) — از شناسه‌ی فروشگاه ساخته می‌شود. */
export function storeCodeFromId(storeId: string): string {
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) {
    hash = (hash * 31 + storeId.charCodeAt(i)) % 1_000_003;
  }
  return String(100 + (hash % 900));
}

export interface GenerateEan13Options {
  /** پیشوند GS1 — پیش‌فرض ۶۲۸ (ایران) */
  prefix?: string;
  /** کد فروشگاه (۳ رقم) — از `storeCodeFromId()` بگیرید */
  storeCode?: string;
  /** شماره‌ی سریال ۶ رقمی؛ اگر ندهید تصادفی تولید می‌شود */
  serial?: number;
  /** مولد عدد تصادفی — برای تست‌های قطعی */
  random?: () => number;
}

/**
 * ساخت یک بارکد EAN-13 معتبر.
 * خروجی همیشه ۱۳ رقم و «قابل اسکن» است (رقم کنترلی محاسبه‌شده).
 */
export function generateEan13(options: GenerateEan13Options = {}): string {
  const prefix = digitsOnly(options.prefix ?? GS1_IRAN_PREFIX, 3);
  const storeCode = digitsOnly(options.storeCode ?? "0", 3).padStart(3, "0");
  const random = options.random ?? Math.random;
  const serial =
    options.serial !== undefined
      ? Math.abs(Math.trunc(options.serial)) % 1_000_000
      : Math.floor(random() * 1_000_000);
  return ean13WithCheckDigit(`${prefix}${storeCode}${String(serial).padStart(6, "0")}`);
}

/** چند بارکد پشت‌سرهم (برای «تولید به اندازه‌ی محصولات»). */
export function generateEan13Batch(count: number, options: GenerateEan13Options = {}): string[] {
  const total = Math.max(0, Math.min(500, Math.trunc(count) || 0));
  const random = options.random ?? Math.random;
  const codes = new Set<string>();
  // اگر سریال دستی داده نشده، هر بار تصادفی است؛ ولی برای اطمینان
  // از تکراری‌نشدن داخل همین دسته، تا رسیدن به تعداد دلخواه تلاش می‌کنیم.
  let guard = total * 20 + 100;
  while (codes.size < total && guard-- > 0) {
    const code = generateEan13({ ...options, random });
    codes.add(code);
  }
  return [...codes];
}

/** بارکد خالی/نال؟ (یعنی محصول هنوز بارکد ندارد و باید بسازیم) */
export function isBlankBarcode(value: string | null | undefined): boolean {
  const code = normalizeBarcode(value ?? "");
  return code.length === 0 || code === "NONE" || code === "NO-BARCODE";
}

/** Human-readable label for a format. */
export function barcodeFormatLabel(format: BarcodeFormat): string {
  switch (format) {
    case "EAN13":
      return "EAN-13";
    case "EAN8":
      return "EAN-8";
    case "UPCA":
      return "UPC-A";
    case "CODE128":
      return "Code 128";
    default:
      return "نامشخص";
  }
}
