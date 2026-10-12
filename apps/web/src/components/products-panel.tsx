"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createProduct, deleteProduct, updateProduct } from "@my-store/api-client";
import type { Category } from "@my-store/shared-types";
import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-store/ui-kit/components/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@my-store/ui-kit/components/empty";
import { Input } from "@my-store/ui-kit/components/input";
import { Label } from "@my-store/ui-kit/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-store/ui-kit/components/select";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import { Tabs, TabsList, TabsTrigger } from "@my-store/ui-kit/components/tabs";
import { Textarea } from "@my-store/ui-kit/components/textarea";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

export interface ProductRow {
  id: string;
  name: string;
  barcode: string;
  sku: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  costPrice: number;
  salePrice: number;
  stock: number;
  lowStockThreshold: number;
}

type StockView = "all" | "low" | "out";
type SortKey = "new" | "name" | "price" | "stock";

type Draft = {
  id?: string;
  name: string;
  barcode: string;
  sku: string;
  description: string;
  categoryId: string;
  costPrice: string;
  salePrice: string;
  stock: string;
  lowStockThreshold: string;
};

function emptyDraft(threshold: number): Draft {
  return {
    name: "",
    barcode: "",
    sku: "",
    description: "",
    categoryId: "",
    costPrice: "0",
    salePrice: "0",
    stock: "0",
    lowStockThreshold: String(threshold),
  };
}

export function ProductsPanel({
  products,
  categories,
  canManage,
  currency = "IRR",
  lowStockDefault = 5,
}: {
  products: ProductRow[];
  categories: Category[];
  canManage: boolean;
  currency?: string;
  lowStockDefault?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("all");
  const [view, setView] = React.useState<StockView>("all");
  const [sort, setSort] = React.useState<SortKey>("new");
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft(lowStockDefault));
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = products.filter((product) => {
      const matchesQuery =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.barcode.toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q);
      const matchesCategory = categoryId === "all" || product.categoryId === categoryId;
      const matchesView =
        view === "all" ||
        (view === "low" && product.stock <= product.lowStockThreshold) ||
        (view === "out" && product.stock <= 0);
      return matchesQuery && matchesCategory && matchesView;
    });
    return [...rows].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "fa");
      if (sort === "price") return b.salePrice - a.salePrice;
      if (sort === "stock") return a.stock - b.stock;
      return 0;
    });
  }, [products, query, categoryId, view, sort]);

  const lowCount = products.filter((product) => product.stock <= product.lowStockThreshold).length;
  const outCount = products.filter((product) => product.stock <= 0).length;

  function openCreate() {
    setDraft(emptyDraft(lowStockDefault));
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setDraft({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      sku: product.sku ?? "",
      description: product.description ?? "",
      categoryId: product.categoryId ?? "",
      costPrice: String(product.costPrice),
      salePrice: String(product.salePrice),
      stock: String(product.stock),
      lowStockThreshold: String(product.lowStockThreshold),
    });
    setOpen(true);
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const payload = {
      name: draft.name,
      barcode: draft.barcode,
      sku: draft.sku,
      description: draft.description,
      categoryId: draft.categoryId,
      costPrice: Number(draft.costPrice || 0),
      salePrice: Number(draft.salePrice || 0),
      stock: Number(draft.stock || 0),
      lowStockThreshold: Number(draft.lowStockThreshold || 0),
    };
    try {
      if (draft.id) await updateProduct(draft.id, payload);
      else await createProduct(payload);
      toast.success(draft.id ? "محصول ویرایش شد" : "محصول ثبت شد");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت محصول ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(product: ProductRow) {
    if (!confirm(`«${product.name}» حذف شود؟`)) return;
    try {
      await deleteProduct(product.id);
      toast.success("محصول حذف شد");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حذف ممکن نشد");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as StockView)}>
          <TabsList>
            <TabsTrigger value="all">همه ({toPersianDigits(products.length)})</TabsTrigger>
            <TabsTrigger value="low">کم‌موجود ({toPersianDigits(lowCount)})</TabsTrigger>
            <TabsTrigger value="out">ناموجود ({toPersianDigits(outCount)})</TabsTrigger>
          </TabsList>
        </Tabs>
        {canManage ? (
          <Button onClick={openCreate}>
            <PackagePlus className="size-4" />
            محصول جدید
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-52 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی نام، بارکد یا SKU…"
            className="ps-9"
          />
        </div>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="دسته" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortKey)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">جدیدترین</SelectItem>
            <SelectItem value="name">نام</SelectItem>
            <SelectItem value="price">قیمت فروش</SelectItem>
            <SelectItem value="stock">کمترین موجودی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search />
            </EmptyMedia>
            <EmptyTitle>محصولی پیدا نشد</EmptyTitle>
            <EmptyDescription>فیلتر یا عبارت جست‌وجو را تغییر دهید.</EmptyDescription>
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
                {canManage ? <TableHead>قیمت خرید</TableHead> : null}
                <TableHead>قیمت فروش</TableHead>
                <TableHead>موجودی</TableHead>
                {canManage ? <TableHead className="w-24">عملیات</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const isLow = product.stock <= product.lowStockThreshold;
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell dir="ltr" className="text-muted-foreground text-xs">
                      {product.barcode || "—"}
                    </TableCell>
                    <TableCell>{product.categoryName ?? "—"}</TableCell>
                    {canManage ? (
                      <TableCell className="tabular-nums">
                        {formatCurrency(product.costPrice, currency)}
                      </TableCell>
                    ) : null}
                    <TableCell className="tabular-nums">
                      {formatCurrency(product.salePrice, currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isLow ? "warning" : "secondary"}>
                        {toPersianDigits(product.stock)}
                      </Badge>
                    </TableCell>
                    {canManage ? (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => onDelete(product)}>
                            <Trash2 className="text-destructive size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? "ویرایش محصول" : "محصول جدید"}</DialogTitle>
            <DialogDescription>
              قیمت، موجودی و بارکد فقط توسط مدیر قابل تغییر است. بارکد خالی یعنی ساخت خودکار.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="product-name">نام *</Label>
              <Input
                id="product-name"
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-barcode">بارکد</Label>
              <Input
                id="product-barcode"
                dir="ltr"
                value={draft.barcode}
                onChange={(event) => setDraft({ ...draft, barcode: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-sku">SKU</Label>
              <Input
                id="product-sku"
                dir="ltr"
                value={draft.sku}
                onChange={(event) => setDraft({ ...draft, sku: event.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>دسته</Label>
              <Select
                value={draft.categoryId || "NONE"}
                onValueChange={(value) =>
                  setDraft({ ...draft, categoryId: value === "NONE" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="بدون دسته" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">بدون دسته</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost">قیمت خرید</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                dir="ltr"
                value={draft.costPrice}
                onChange={(event) => setDraft({ ...draft, costPrice: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale">قیمت فروش</Label>
              <Input
                id="sale"
                type="number"
                min={0}
                dir="ltr"
                required
                value={draft.salePrice}
                onChange={(event) => setDraft({ ...draft, salePrice: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">موجودی</Label>
              <Input
                id="stock"
                type="number"
                min={0}
                dir="ltr"
                value={draft.stock}
                onChange={(event) => setDraft({ ...draft, stock: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low">حد کم‌موجودی</Label>
              <Input
                id="low"
                type="number"
                min={0}
                dir="ltr"
                value={draft.lowStockThreshold}
                onChange={(event) => setDraft({ ...draft, lowStockThreshold: event.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="desc">توضیح</Label>
              <Textarea
                id="desc"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : null}
                ذخیره
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
