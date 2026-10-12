"use client";

import * as React from "react";
import { Search, Wallet } from "lucide-react";

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
import { formatCurrency, formatDateJalali } from "@my-store/shared-utils";

export interface ExpenseRow {
  id: string;
  title: string;
  categoryName: string | null;
  date: string;
  amount: number;
  note: string | null;
}

/** جدول هزینه‌ها — Table + Input شادcn. */
export function ExpensesTable({ expenses }: { expenses: ExpenseRow[] }) {
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (expense) =>
        expense.title.toLowerCase().includes(q) ||
        (expense.categoryName ?? "").toLowerCase().includes(q) ||
        (expense.note ?? "").toLowerCase().includes(q),
    );
  }, [expenses, query]);

  if (expenses.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Wallet />
          </EmptyMedia>
          <EmptyTitle>هنوز هزینه‌ای ثبت نشده</EmptyTitle>
          <EmptyDescription>
            هزینه‌های فروشگاه (اجاره، قبض، حمل…) را از فرم کنار صفحه ثبت کنید.
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
          placeholder="جست‌وجوی عنوان یا دسته…"
          className="ps-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>هزینه‌ای پیدا نشد</EmptyTitle>
            <EmptyDescription>عبارت جست‌وجو را تغییر دهید.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>عنوان</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>مبلغ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">
                    {expense.title}
                    {expense.note ? (
                      <span className="text-muted-foreground block text-xs">
                        {expense.note}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.categoryName ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateJalali(expense.date)}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatCurrency(expense.amount)}
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
