"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import { listScanEvents, subscribeToScans } from "@my-store/api-client";
import { formatDateTimeJalali, SCAN_TYPE_LABELS, timeAgo, toPersianDigits } from "@my-store/shared-utils";
import type { ScanEvent } from "@my-store/shared-types";

const MAX_ITEMS = 50;
/** فاصله‌ی پولینگ پشتیبان — اگر SSE قطع شود چیزی از قلم نمی‌افتد. */
const POLL_INTERVAL_MS = 15_000;

/** ادغام رویدادها بر اساس id، جدیدترین اول. */
function mergeEvents(fresh: ScanEvent[], prev: ScanEvent[]): ScanEvent[] {
  const seen = new Set(fresh.map((e) => e.id));
  const merged = [...fresh];
  for (const event of prev) {
    if (!seen.has(event.id)) merged.push(event);
  }
  merged.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return merged.slice(0, MAX_ITEMS);
}

/**
 * فید زنده‌ی رویدادهای اسکن.
 *
 * دو لایه دارد:
 *   ۱) SSE (`/api/scan/stream`) — لحظه‌ای، وقتی اتصال برقرار است
 *   ۲) پولینگ سبک هر ۱۵ ثانیه — روی سرورلس (Vercel) که عمر کانکشن
 *      محدود است، تضمین می‌کند هیچ اسکنی از قلم نیفتد
 */
export function ScanFeed() {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    try {
      const page = await listScanEvents({ pageSize: 30 });
      for (const event of page.items) seenIdsRef.current.add(event.id);
      setEvents((prev) => mergeEvents(page.items, prev));
    } catch {
      // شبکه قطع است — دور بعدی دوباره تلاش می‌کند
    }
  }, []);

  useEffect(() => {
    // بارگذاری اولیه (با تأخیر صفر تا setState همزمان داخل effect نباشد)
    const initialTimer = setTimeout(() => void refresh(), 0);

    // لایه‌ی ۱: SSE — رویدادها آنی می‌رسند
    const unsubscribe = subscribeToScans(
      (event) => {
        if (seenIdsRef.current.has(event.id)) return;
        seenIdsRef.current.add(event.id);
        setEvents((prev) => mergeEvents([event], prev));
        setConnected(true);
      },
      () => setConnected(false),
    );

    // لایه‌ی ۲: پولینگ پشتیبان
    const pollTimer = setInterval(() => void refresh(), POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimer);
      unsubscribe();
      clearInterval(pollTimer);
    };
  }, [refresh]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            فید زنده اسکن‌ها
          </span>
          <Badge variant={connected ? "success" : "secondary"}>
            {connected ? "آنلاین" : "در حال اتصال..."}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            هنوز اسکن ثبت نشده است. با اپ اسکنر (گوشی) بارکد را اسکن کنید؛
            اینجا لحظه‌ای نمایش داده می‌شود.
          </p>
        ) : (
          <ul className="space-y-3">
            {events.map((event) => (
              <li
                key={event.id}
                className="flex items-start justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {event.product ? event.product.name : "محصول تعریف نشده"}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs" dir="ltr">
                    {event.barcode}
                    {event.userName ? ` · ${event.userName}` : ""}
                    {event.device ? ` · ${event.device}` : ""}
                  </div>
                  <div className="text-muted-foreground mt-0.5 text-xs">
                    {timeAgo(event.createdAt)} · {formatDateTimeJalali(event.createdAt)}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge variant={event.product ? "default" : "warning"}>
                    {SCAN_TYPE_LABELS[event.type]}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {toPersianDigits(event.qty)} عدد
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
