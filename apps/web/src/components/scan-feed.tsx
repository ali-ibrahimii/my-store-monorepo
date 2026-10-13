"use client";

import * as React from "react";
import { Radio, Smartphone } from "lucide-react";

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
import { cn } from "@my-store/ui-kit/lib/utils";
import {
  formatDateTimeJalali,
  SCAN_TYPE_LABELS,
  timeAgo,
  toPersianDigits,
} from "@my-store/shared-utils";

import { useLiveStore } from "@/lib/live-client";

/**
 * فید زنده‌ی رویدادهای اسکن.
 *
 * منبع داده: سوپابیس Realtime (WebSocket). اگر فعال نباشد، پولینگ سبک
 * هر ۳ ثانیه فقط «تازه‌ها» را می‌گیرد. روی ورسل (سرورلس) هم کار می‌کند،
 * چون وضعیت از دیتابیس خوانده می‌شود، نه از حافظه‌ی یک پروسه.
 */
export function ScanFeed({ storeId }: { storeId: string }) {
  const { scans, cart, status } = useLiveStore({ storeId, withScans: true });
  const events = scans;
  const loading = status === "connecting" && events.length === 0;

  const connected = status === "realtime";

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
      <CardContent className="space-y-3">
        {cart.length > 0 ? (
          <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs">
            <Smartphone className="text-primary size-3.5" />
            <span className="font-medium">سبد در حال اسکن روی گوشی:</span>
            <span className="text-muted-foreground">
              {toPersianDigits(cart.reduce((sum, line) => sum + line.qty, 0))} قلم
              {cart[0]?.name ? ` — آخرین: ${cart[0].name}` : ""}
            </span>
          </div>
        ) : null}

        {loading ? (
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
                    {event.type === "CART" ? <Smartphone /> : <Radio />}
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
