// ============================================================
// Scanner API — record scans & subscribe to the real-time stream
// ============================================================

import type { CreateScanInput, Page, ScanEvent } from "@my-store/shared-types";
import { API_ROUTES } from "@my-store/shared-utils";
import { apiGet, apiPost } from "./client";

/** Record a scan event (persisted immediately, broadcast in real-time). */
export function recordScan(input: CreateScanInput): Promise<ScanEvent> {
  return apiPost(API_ROUTES.scan, input);
}

/** Recent scan events (for the live feed initial state). */
export function listScanEvents(query?: {
  page?: number;
  pageSize?: number;
}): Promise<Page<ScanEvent>> {
  return apiGet(API_ROUTES.scan, {
    page: query?.page,
    pageSize: query?.pageSize,
  });
}

/**
 * Subscribe to the real-time scan stream (Server-Sent Events).
 * Returns an unsubscribe function.
 */
export function subscribeToScans(
  onEvent: (event: ScanEvent) => void,
  onError?: (error: Event) => void,
): () => void {
  const source = new EventSource(API_ROUTES.scanStream);
  source.onmessage = (message) => {
    try {
      const data = JSON.parse(message.data);
      if (data?.type === "scan" && data.event) onEvent(data.event as ScanEvent);
    } catch {
      // ignore malformed frames (e.g. ping comments)
    }
  };
  if (onError) source.onerror = onError;
  return () => source.close();
}
