"use client";

import * as React from "react";
import { Search, Users } from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import { formatCurrency } from "@my-store/shared-utils";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
}

/** جدول مشتریان — Table + Input شادcn. */
export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(q) ||
        (customer.phone ?? "").includes(q) ||
        (customer.address ?? "").toLowerCase().includes(q),
    );
  }, [customers, query]);

  if (customers.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>هنوز مشتری‌ای ثبت نشده</EmptyTitle>
          <EmptyDescription>
            از فرم کنار صفحه اولین مشتری را اضافه کنید.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="جست‌وجوی نام، تلفن یا آدرس…"
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>مشتری‌ای پیدا نشد</EmptyTitle>
            <EmptyDescription>عبارت جست‌وجو را تغییر دهید.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>تلفن</TableHead>
                <TableHead>آدرس</TableHead>
                <TableHead>مانده حساب</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell dir="ltr" className="text-muted-foreground text-xs">
                    {customer.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.address ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.balance > 0 ? "warning" : "secondary"}>
                      {formatCurrency(customer.balance)}
                    </Badge>
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
