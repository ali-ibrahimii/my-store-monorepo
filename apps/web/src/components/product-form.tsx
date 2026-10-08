"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@my-store/ui-kit";
import { createProduct, createCategory } from "@my-store/api-client";
import type { Category } from "@my-store/shared-types";

interface ProductFormProps {
  categories: Pick<Category, "id" | "name">[];
}

export function ProductForm({ categories }: ProductFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const form = new FormData(event.currentTarget);
      await createProduct({
        name: String(form.get("name") ?? ""),
        barcode: String(form.get("barcode") ?? ""),
        sku: String(form.get("sku") ?? ""),
        description: String(form.get("description") ?? ""),
        costPrice: Number(form.get("costPrice") ?? 0),
        salePrice: Number(form.get("salePrice") ?? 0),
        stock: Number(form.get("stock") ?? 0),
        lowStockThreshold: Number(form.get("lowStockThreshold") ?? 5),
        categoryId: String(form.get("categoryId") ?? ""),
      });
      (event.target as HTMLFormElement).reset();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت محصول");
    } finally {
      setBusy(false);
    }
  }

  async function onAddCategory() {
    if (!newCategory.trim()) return;
    try {
      await createCategory({ name: newCategory.trim() });
      setNewCategory("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت دسته");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">نام محصول *</Label>
          <Input id="name" name="name" required placeholder="مثلاً شیر ۱ لیتری" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="barcode">بارکد (EAN-13 / UPC / Code128) *</Label>
          <Input
            id="barcode"
            name="barcode"
            required
            dir="ltr"
            placeholder="6281234567890"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sku">کد SKU</Label>
          <Input id="sku" name="sku" dir="ltr" placeholder="اختیاری" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="categoryId">دسته‌بندی</Label>
          <select
            id="categoryId"
            name="categoryId"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            defaultValue=""
          >
            <option value="">— بدون دسته —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="costPrice">قیمت خرید (تومان)</Label>
          <Input id="costPrice" name="costPrice" type="number" min={0} defaultValue={0} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salePrice">قیمت فروش (تومان) *</Label>
          <Input id="salePrice" name="salePrice" type="number" min={0} required defaultValue={0} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stock">موجودی اولیه</Label>
          <Input id="stock" name="stock" type="number" min={0} defaultValue={0} dir="ltr" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lowStockThreshold">حداقل موجودی (هشدار)</Label>
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={5}
            dir="ltr"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">توضیحات</Label>
          <Input id="description" name="description" placeholder="اختیاری" />
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border border-dashed p-3">
        <Input
          value={newCategory}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCategory(e.target.value)}
          placeholder="دسته‌بندی جدید"
          className="max-w-xs"
        />
        <Button type="button" variant="secondary" size="sm" onClick={onAddCategory}>
          افزودن دسته
        </Button>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت محصول"}
      </Button>
    </form>
  );
}
