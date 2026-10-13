import { requireStoreUser } from "@/lib/api-helpers";
import { scanBus } from "@/lib/realtime";
import type { ScanEvent, ScanStreamMessage } from "@my-store/shared-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const encoder = new TextEncoder();

/**
 * GET /api/scan/stream — Server-Sent Events stream of scan events.
 * Every connected device (phone scanner, POS screen, dashboard) receives
 * each scan the moment it is recorded.
 */
export async function GET() {
  const { user, response } = await requireStoreUser();
  if (!user) return response;

  await scanBus.init();

  let unsubscribe: (() => void) | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (payload: ScanStreamMessage | { type: "connected" }) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
          );
        } catch {
          // client disconnected
        }
      };

      send({ type: "connected" });

      unsubscribe = scanBus.onScan((event: ScanEvent) => {
        send({ type: "scan", event });
      });

      // Keep the connection alive through proxies (and detect dead clients)
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          // client disconnected
        }
      }, 15000);

      // روی ورسل عمر تابع محدود است؛ خودمان بعد از ۵۰ ثانیه اتصال را
      // تمیز می‌بندیم. EventSource مرورگر خودش دوباره وصل می‌شود و
      // در فاصله‌ی اتصال، پولینگ سبک `/api/live` چیزی را از دست نمی‌دهد.
      closeTimer = setTimeout(() => {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }, 50_000);
    },
    cancel() {
      if (unsubscribe) unsubscribe();
      if (pingTimer) clearInterval(pingTimer);
      if (closeTimer) clearTimeout(closeTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
