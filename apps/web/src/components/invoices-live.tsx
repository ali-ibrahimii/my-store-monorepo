"use client";

// ============================================================
// فهرست فاکتورها — زنده
//
// • بار اول از سرور (SSR) داده می‌گیرد: صفحه سریع باز می‌شود.
// • بعد از آن با سوپابیس Realtime و پشتیبانِ پولینگ، هر فاکتوری که
//   روی گوشی (اپ اسکنر) ثبت شود در همان لحظه اینجا ظاهر می‌شود.
// • روی هر ردیف، دکمه‌ی «چاپ» هست تا فاکتور را روی کاغذ بدهید.
// ============================================================

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Printer, Receipt, Search, Smartphone, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import { Card, CardContent } from "@my-store/ui-kit/components/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-store/ui-kit/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import { cn } from "@my-store/ui-kit/lib/utils";
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";
import type { LiveCartLine, LiveInvoiceHead } from "@my-store/shared-types";

import { useLiveStore } from "@/lib/live-client";
import { InvoiceStatusBadge } from "./invoice-status-badge";

interface InvoicesLiveProps {
  storeId: string;
  initialInvoices: LiveInvoiceHead[];
  initialCart: LiveCartLine[];
  /** صدا/اعلان هنگام رسیدن فاکتور تازه */
  notify?: boolean;
}

function CartBar({ cart }: { cart: LiveCartLine[] }) {
  if (cart.length === 0) return null;
  const qty = cart.reduce((sum, line) => sum + line.qty, 0);
  const amount = cart.reduce((sum, line) => sum + line.qty * line.salePrice, 0);
  return (
    <div className="border-primary/40 bg-primary/5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-dashed px-3 py-2 text-sm">
      <span className="flex items-center gap-1.5 font-medium">
        <Smartphone className="text-primary size-4" />
        در حال اسکن روی گوشی
        <span className="bg-primary inline-block size-2 animate-pulse rounded-full" />
      </span>
      <span className="text-muted-foreground">
        {toPersianDigits(qty)} قلم · {formatCurrency(amount)}
      </span>
      <span className="text-muted-foreground ms-auto hidden text-xs sm:inline">
        با زدن کلید «ثبت فاکتور» روی گوشی، همین‌جا به فاکتور تبدیل می‌شود
      </span>
    </div>
  );
}

export function InvoicesLive({
  storeId,
  initialInvoices,
  initialCart,
  notify = true,
}: InvoicesLiveProps) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");

  const onNewInvoice = React.useCallback(
    (invoice: Pick<LiveInvoiceHead, "id" | "number" | "total">) => {
      if (!notify) return;
      toast.success(`فاکتور جدید از اسکنر: ${invoice.number}`, {
        description: `${formatCurrency(invoice.total)} — برای چاپ کلیک کنید`,
        action: {
          label: "چاپ",
          onClick: () => window.open(`/print/invoices/${invoice.id}`, "_blank"),
        },
        duration: 10_000,
      });
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } catch {
        // صدا در دسترس نیست
      }
    },
    [notify],
  );

  const { invoices, cart, status: liveStatus, freshInvoiceIds } = useLiveStore({
    storeId,
    initialInvoices,
    initialCart,
    onNewInvoice,
  });

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const matchesQuery =
        !q ||
        invoice.number.toLowerCase().includes(q) ||
        (invoice.customerName ?? "").toLowerCase().includes(q);
      const matchesStatus = status === "ALL" || invoice.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [invoices, query, status]);

  const statusLabel: Record<string, string> = {
    connecting: "در حال اتصال…",
    realtime: "لحظه‌ای",
    polling: "به‌روزرسانی خودکار",
    offline: "قطع",
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="شماره فاکتور یا نام مشتری…"
            className="ps-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
            {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge
          variant={liveStatus === "realtime" ? "default" : liveStatus === "offline" ? "destructive" : "secondary"}
          className="ms-auto gap-1"
        >
          {liveStatus === "offline" ? <WifiOff className="size-3" /> : <Wifi className="size-3" />}
          {statusLabel[liveStatus] ?? liveStatus}
        </Badge>
        <Button variant="outline" size="sm" onClick={() => router.refresh()}>
          بازخوانی
        </Button>
      </div>

      <CartBar cart={cart} />

      {invoices.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Receipt />
            </EmptyMedia>
            <EmptyTitle>هنوز فاکتوری ثبت نشده</EmptyTitle>
            <EmptyDescription>
              فاکتور را از دکمه‌ی «فاکتور جدید» بسازید، یا روی گوشی با اپ اسکنر
              اقلام را اسکن کنید و کلید «ثبت فاکتور» را بزنید.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>فاکتوری پیدا نشد</EmptyTitle>
            <EmptyDescription>فیلترها را تغییر دهید.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شماره</TableHead>
                <TableHead>مشتری</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>پرداخت‌شده</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="text-end">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={cn(
                    "transition-colors",
                    freshInvoiceIds.has(invoice.id) && "bg-primary/5 animate-in fade-in",
                  )}
                >
                  <TableCell dir="ltr" className="font-medium">
                    <Link
                      href={`/accounting/invoices/${invoice.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                    {freshInvoiceIds.has(invoice.id) ? (
                      <Badge variant="secondary" className="ms-2 text-[10px]">
                        جدید
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{invoice.customerName ?? "حضوری"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateJalali(invoice.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(invoice.paidAmount)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/accounting/invoices/${invoice.id}`}>جزئیات</Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/print/invoices/${invoice.id}`} target="_blank">
                          <Printer className="size-3.5" />
                          چاپ
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Card className="bg-muted/40">
        <CardContent className="text-muted-foreground flex flex-wrap items-center gap-2 p-3 text-xs">
          <Smartphone className="size-3.5" />
          راه سریع فروش: گوشی را به اپ اسکنر وصل کنید، اقلام را اسکن کنید،
          «ثبت فاکتور» را بزنید — فاکتور همین‌جا می‌آید و با دکمه‌ی چاپ،
          رسید را به مشتری بدهید.
        </CardContent>
      </Card>
    </div>
  );
}
