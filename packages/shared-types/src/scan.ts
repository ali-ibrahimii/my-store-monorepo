// ============================================================
// Scanner types: real-time barcode scan events
// ============================================================

export const SCAN_TYPES = [
  "SALE",
  "COUNT",
  "CHECK_IN",
  "CHECK_OUT",
  "ADJUSTMENT",
] as const;
export type ScanType = (typeof SCAN_TYPES)[number];

export interface ScanEvent {
  id: string;
  productId: string | null;
  /** The scanned barcode (normalized). Product may be unknown. */
  barcode: string;
  type: ScanType;
  qty: number;
  device: string | null;
  note: string | null;
  userId: string | null;
  userName?: string | null;
  storeId: string;
  createdAt: string;
  /** Populated when the product is known. */
  product?: {
    id: string;
    name: string;
    barcode: string;
    salePrice: number;
    stock: number;
  } | null;
}

export interface CreateScanInput {
  barcode: string;
  type?: ScanType;
  qty?: number;
  device?: string;
  note?: string;
}

/** Payload pushed to SSE clients in real-time. */
export interface ScanStreamMessage {
  type: "scan";
  event: ScanEvent;
}

export interface ScanLookupResult {
  found: boolean;
  product?: ScanEvent["product"];
}
