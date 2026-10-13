"use client";

import * as React from "react";
import { Printer, X } from "lucide-react";

import { Button } from "@my-store/ui-kit/components/button";

/**
 * ابزار چاپ صفحه‌ی رسید:
 *  • خودکار چاپ را باز می‌کند (وقتی `auto` روشن است)
 *  • دکمه‌ی چاپ و بازگشت
 * خودِ برگه با CSS چاپ استایل شده و این نوار در چاپ دیده نمی‌شود.
 */
export function PrintControls({
  auto = true,
  backHref = "/accounting",
}: {
  auto?: boolean;
  backHref?: string;
}) {
  React.useEffect(() => {
    if (!auto) return;
    const timer = setTimeout(() => window.print(), 600);
    return () => clearTimeout(timer);
  }, [auto]);

  return (
    <div className="no-print mb-4 flex items-center justify-between gap-2">
      <div className="text-muted-foreground text-xs">
        برای تغییر اندازه‌ی کاغذ یا حاشیه‌ها، از پنجره‌ی چاپ مرورگر استفاده کنید.
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <a href={backHref}>
            <X className="size-3.5" />
            بستن
          </a>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="size-3.5" />
          چاپ
        </Button>
      </div>
    </div>
  );
}
