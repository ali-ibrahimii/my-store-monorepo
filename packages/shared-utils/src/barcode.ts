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
