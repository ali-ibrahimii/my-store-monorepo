"use client";

import * as React from "react";
import { PackageSearch, Search } from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Input } from "@my-store/ui-kit/components/input";
import { Progress } from "@my-store/ui-kit/components/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import { Tabs, TabsList, TabsTrigger } from "@my-store/ui-kit/components/tabs";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

export interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  sku: string | null;
  categoryName: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  lowStockThreshold: number;
}

/** جدول محصولات — Table + Tabs + Input شادcn (فیلتر سمت کلاینت). */
export function ProductsTable({ products }: { products: ProductRow[] }) {
  const [query, setQuery] = React.useState("");
  const [view, setView] = React.useState<"all" | "low">("all");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q);
      const matchesView =
        view === "all" || product.stock <= product.lowStockThreshold;
      return matchesQuery && matchesView;
    });
  }, [products, query, view]);

  const lowStockCount = products.filter(
    (product) => product.stock <= product.lowStockThreshold,
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as "all" | "low")}>
          <TabsList>
            <TabsTrigger value="all">
              همه ({toPersianDigits(products.length)})
            </TabsTrigger>
            <TabsTrigger value="low">
              کم‌موجود ({toPersianDigits(lowStockCount)})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی نام، بارکد یا SKU…"
            className="ps-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PackageSearch />
            </EmptyMedia>
            <EmptyTitle>محصولی پیدا نشد</EmptyTitle>
            <EmptyDescription>
              {products.length === 0
                ? "هنوز محصولی ثبت نشده — از فرم کنار صفحه اضافه کنید."
                : "عبارت جست‌وجو را تغییر دهید یا فیلتر را بردارید."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>بارکد</TableHead>
                <TableHead>دسته</TableHead>
                <TableHead>قیمت خرید</TableHead>
                <TableHead>قیمت فروش</TableHead>
                <TableHead className="w-40">موجودی</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const isLow = product.stock <= product.lowStockThreshold;
                const ratio =
                  product.lowStockThreshold > 0
                    ? Math.min(100, (product.stock / (product.lowStockThreshold * 3)) * 100)
                    : 100;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground text-xs">
                      {product.barcode}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.categoryName ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(product.costPrice)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatCurrency(product.salePrice)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={ratio} className="w-16" />
                        <Badge variant={isLow ? "warning" : "secondary"}>
                          {toPersianDigits(product.stock)}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
