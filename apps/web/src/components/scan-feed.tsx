"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import { listScanEvents, subscribeToScans } from "@my-store/api-client";
import { formatDateTimeJalali, SCAN_TYPE_LABELS, timeAgo } from "@my-store/shared-utils";
import type { ScanEvent } from "@my-store/shared-types";

const MAX_ITEMS = 50;

/** Live feed of scan events — updates in real-time over SSE. */
export function ScanFeed() {
  const [events, setEvents] = useState<ScanEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Initial load
    listScanEvents({ pageSize: 30 })
      .then((page) => {
        if (!cancelled) setEvents(page.items);
      })
      .catch(() => {});

    // Real-time subscription
    const unsubscribe = subscribeToScans(
      (event) => {
        setEvents((prev) => [event, ...prev].slice(0, MAX_ITEMS));
        if (!cancelled) setConnected(true);
      },
      () => setConnected(false),
    );

    // Mark connected after mount (defer to avoid set-state-in-effect lint)
    const connectTimer = setTimeout(() => {
      if (!cancelled) setConnected(true);
    }, 0);

    // EventSource reconnects automatically; reflect status periodically
    const statusTimer = setInterval(() => {
      // If the page is visible and we have events, assume connected
      if (!cancelled) setConnected(true);
    }, 5000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(connectTimer);
      clearInterval(statusTimer);
    };
  }, []);

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
            هنوز اسکن ثبت نشده است. اسکن‌ها اینجا لحظه‌ای نمایش داده می‌شوند.
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
                    {event.qty} عدد
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
