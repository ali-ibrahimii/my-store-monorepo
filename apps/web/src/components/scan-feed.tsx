"use client";

import * as React from "react";
import { Radio } from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@my-store/ui-kit/components/item";
import { ScrollArea } from "@my-store/ui-kit/components/scroll-area";
import { Skeleton } from "@my-store/ui-kit/components/skeleton";
import {
  formatDateTimeJalali,
  SCAN_TYPE_LABELS,
  timeAgo,
  toPersianDigits,
} from "@my-store/shared-utils";
import { listScanEvents, subscribeToScans } from "@my-store/api-client";
import type { ScanEvent } from "@my-store/shared-types";
import { cn } from "@my-store/ui-kit/lib/utils";

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
  const [events, setEvents] = React.useState<ScanEvent[]>([]);
  const [loaded, setLoaded] = React.useState(false);
  const [connected, setConnected] = React.useState(false);
  const seenIdsRef = React.useRef<Set<string>>(new Set());

  const refresh = React.useCallback(async () => {
    try {
      const page = await listScanEvents({ pageSize: 30 });
      for (const event of page.items) seenIdsRef.current.add(event.id);
      setEvents((prev) => mergeEvents(page.items, prev));
    } catch {
      // شبکه قطع است — دور بعدی دوباره تلاش می‌کند
    } finally {
      setLoaded(true);
    }
  }, []);

  React.useEffect(() => {
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="size-4" />
          فید زنده اسکن‌ها
          <span
            className={cn(
              "ms-auto inline-flex size-2 rounded-full",
              connected ? "bg-success animate-pulse" : "bg-muted-foreground/40",
            )}
            aria-hidden
          />
        </CardTitle>
        <CardDescription>
          اسکن‌های اپ گوشی لحظه‌ای اینجا نمایش داده می‌شوند.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full rounded-md" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Radio />
              </EmptyMedia>
              <EmptyTitle>هنوز اسکنی ثبت نشده</EmptyTitle>
              <EmptyDescription>
                با اپ اسکنر (گوشی) بارکد را اسکن کنید؛ نتیجه همان لحظه اینجا
                ظاهر می‌شود.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ScrollArea className="h-[420px] pe-3">
            <ItemGroup>
              {events.map((event) => (
                <Item key={event.id} variant="outline" size="sm">
                  <ItemMedia variant="icon">
                    <Radio />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {event.product ? event.product.name : "محصول تعریف نشده"}
                    </ItemTitle>
                    <ItemDescription dir="ltr">
                      {event.barcode}
                      {event.userName ? ` · ${event.userName}` : ""}
                      {event.device ? ` · ${event.device}` : ""}
                    </ItemDescription>
                    <ItemDescription>
                      {timeAgo(event.createdAt)} ·{" "}
                      {formatDateTimeJalali(event.createdAt)}
                    </ItemDescription>
                  </ItemContent>
                  <ItemActions className="flex-col items-end gap-1">
                    <Badge variant={event.product ? "default" : "warning"}>
                      {SCAN_TYPE_LABELS[event.type] ?? event.type}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {toPersianDigits(event.qty)} عدد
                    </span>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
