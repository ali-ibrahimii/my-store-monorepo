import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getLiveCart, listInvoiceHeads, listScanEvents } from "@/lib/repositories";
import type { LiveSnapshot } from "@my-store/shared-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/live
 *
 * یک درخواست سبک برای «همگام‌سازی لحظه‌ای» وب‌پنل با گوشی:
 *   • فاکتورهای تازه/به‌روزشده از زمان `since`
 *   • سبدی که همین حالا روی گوشی در حال اسکن است
 *   • (اختیاری، با `?scans=1`) آخرین رویدادهای اسکن برای فید زنده
 *
 * روی ورسل (سرورلس) هر درخواست ممکن است به نمونه‌ی دیگری برود؛ به همین
 * دلیل به‌جای اتکا به حافظه‌ی یک پروسه، وضعیت از دیتابیس خوانده می‌شود.
 * این مسیر جایگزینِ مطمئنِ کانال WebSocket است و اگر سوپابیس Realtime
 * فعال باشد، عملاً لازم نمی‌شود.
 */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const sinceRaw = searchParams.get("since");
    const since = sinceRaw ? new Date(sinceRaw) : null;
    const withScans = searchParams.get("scans") === "1";
    const validSince = since && !Number.isNaN(since.getTime()) ? since : null;

    const [invoices, cart, scans] = await Promise.all([
      listInvoiceHeads(user.storeId, validSince ? { since: validSince, limit: 50 } : { limit: 25 }),
      getLiveCart(user.storeId),
      withScans
        ? listScanEvents(user.storeId, { pageSize: 15 }).then((page) => page.items)
        : Promise.resolve([]),
    ]);

    const snapshot: LiveSnapshot = {
      invoices,
      cart,
      scans,
      serverTime: new Date().toISOString(),
    };

    return NextResponse.json(snapshot, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
