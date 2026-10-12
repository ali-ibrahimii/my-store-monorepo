"use client";

import * as React from "react";
import Link from "next/link";
import { Receipt, Search } from "lucide-react";

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
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
} from "@my-store/shared-utils";

import { InvoiceStatusBadge } from "./invoice-status-badge";

export interface InvoiceRow {
  id: string;
  number: string;
  customerName: string | null;
  createdAt: string;
  total: number;
  paidAmount: number;
  status: string;
}

/** جدول فاکتورها — Table + Select + Input شادcn. */
export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("ALL");

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

  if (invoices.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Receipt />
          </EmptyMedia>
          <EmptyTitle>هنوز فاکتوری ثبت نشده</EmptyTitle>
          <EmptyDescription>
            از فرم کنار صفحه اولین فاکتور فروش را صادر کنید.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

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
      </div>

      {filtered.length === 0 ? (
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell dir="ltr" className="font-medium">
                    <Link
                      href={`/accounting/invoices/${invoice.id}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {invoice.number}
                    </Link>
                  </TableCell>
                  <TableCell>{invoice.customerName ?? "حضوری"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateJalali(invoice.createdAt)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(invoice.paidAmount)}
                  </TableCell>
                  <TableCell>
                    <InvoiceStatusBadge status={invoice.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
