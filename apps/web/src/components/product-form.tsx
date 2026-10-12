"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, FolderPlus, PackagePlus } from "lucide-react";
import { toast } from "sonner";

import { createCategory, createProduct } from "@my-store/api-client";
import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@my-store/ui-kit/components/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-store/ui-kit/components/select";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import type { Category } from "@my-store/shared-types";

interface ProductFormProps {
  categories: Pick<Category, "id" | "name">[];
}

export function ProductForm({ categories }: ProductFormProps) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [categoryId, setCategoryId] = React.useState("");

  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [newCategory, setNewCategory] = React.useState("");
  const [categoryBusy, setCategoryBusy] = React.useState(false);

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
        categoryId,
      });
      formRef.current?.reset();
      setCategoryId("");
      toast.success("محصول ثبت شد");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت محصول");
    } finally {
      setBusy(false);
    }
  }

  async function onAddCategory() {
    if (!newCategory.trim()) return;
    setCategoryBusy(true);
    setError(null);
    try {
      await createCategory({ name: newCategory.trim() });
      setNewCategory("");
      setCategoryOpen(false);
      toast.success("دسته‌بندی اضافه شد");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت دسته");
    } finally {
      setCategoryBusy(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">نام محصول *</FieldLabel>
          <Input id="name" name="name" required placeholder="مثلاً شیر ۱ لیتری" />
        </Field>
        <Field>
          <FieldLabel htmlFor="barcode">بارکد (EAN-13 / UPC / Code128) *</FieldLabel>
          <Input
            id="barcode"
            name="barcode"
            required
            dir="ltr"
            placeholder="6281234567890"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="sku">کد SKU</FieldLabel>
          <Input id="sku" name="sku" dir="ltr" placeholder="اختیاری" />
        </Field>
        <Field>
          <FieldLabel htmlFor="category">دسته‌بندی</FieldLabel>
          <div className="flex items-center gap-2">
            <Select
              value={categoryId || "NONE"}
              onValueChange={(value) =>
                setCategoryId(value === "NONE" ? "" : value)
              }
            >
              <SelectTrigger id="category" className="flex-1">
                <SelectValue placeholder="بدون دسته" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">— بدون دسته —</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" title="دسته‌بندی جدید">
                  <FolderPlus className="size-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>دسته‌بندی جدید</DialogTitle>
                  <DialogDescription>
                    یک دسته تازه برای دسته‌بندی محصولات بسازید.
                  </DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel htmlFor="new-category">نام دسته</FieldLabel>
                  <Input
                    id="new-category"
                    value={newCategory}
                    onChange={(event) => setNewCategory(event.target.value)}
                    placeholder="مثلاً لبنیات"
                  />
                </Field>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="ghost">
                      انصراف
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={onAddCategory}
                    disabled={categoryBusy || !newCategory.trim()}
                  >
                    {categoryBusy ? <Spinner /> : null}
                    ثبت دسته
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </Field>
        <Field>
          <FieldLabel htmlFor="costPrice">قیمت خرید (تومان)</FieldLabel>
          <Input id="costPrice" name="costPrice" type="number" min={0} defaultValue={0} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor="salePrice">قیمت فروش (تومان) *</FieldLabel>
          <Input id="salePrice" name="salePrice" type="number" min={0} required defaultValue={0} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor="stock">موجودی اولیه</FieldLabel>
          <Input id="stock" name="stock" type="number" min={0} defaultValue={0} dir="ltr" />
        </Field>
        <Field>
          <FieldLabel htmlFor="lowStockThreshold">حداقل موجودی (هشدار)</FieldLabel>
          <Input
            id="lowStockThreshold"
            name="lowStockThreshold"
            type="number"
            min={0}
            defaultValue={5}
            dir="ltr"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="description">توضیحات</FieldLabel>
          <Input id="description" name="description" placeholder="اختیاری" />
        </Field>
      </FieldGroup>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full sm:w-auto">
        {busy ? <Spinner /> : <PackagePlus className="size-4" />}
        {busy ? "در حال ثبت…" : "ثبت محصول"}
      </Button>
    </form>
  );
}
