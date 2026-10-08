"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button, Input, Label } from "@my-store/ui-kit";
import { createInvoice } from "@my-store/api-client";
import { formatCurrency, PAYMENT_METHOD_LABELS, toPersianDigits } from "@my-store/shared-utils";
import type { Customer, Product } from "@my-store/shared-types";

interface InvoiceFormProps {
  products: Pick<Product, "id" | "name" | "salePrice" | "stock">[];
  customers: Pick<Customer, "id" | "name">[];
}

interface ItemRow {
  productId: string;
  qty: number;
  unitPrice: number;
}

export function InvoiceForm({ products, customers }: InvoiceFormProps) {
  const router = useRouter();
  const [items, setItems] = useState<ItemRow[]>([{ productId: "", qty: 1, unitPrice: 0 }]);
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [note, setNote] = useState("");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CREDIT">("CASH");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.qty * i.unitPrice || 0), 0),
    [items],
  );
  const total = Math.max(0, subtotal - discount + tax);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((prev) => [...prev, { productId: "", qty: 1, unitPrice: 0 }]);
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function onProductChange(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    updateItem(index, {
      productId,
      unitPrice: product ? Number(product.salePrice) : 0,
    });
  }

  async function onSubmit() {
    setError(null);
    const validItems = items.filter((i) => i.productId && i.qty > 0);
    if (validItems.length === 0) {
      setError("حداقل یک آیتم معتبر انتخاب کنید");
      return;
    }
    setBusy(true);
    try {
      await createInvoice({
        customerId: customerId || undefined,
        items: validItems,
        discount,
        tax,
        note: note || undefined,
        issueNow: true,
        ...(paymentAmount > 0
          ? { payment: { method: paymentMethod, amount: paymentAmount } }
          : {}),
      });
      setItems([{ productId: "", qty: 1, unitPrice: 0 }]);
      setCustomerId("");
      setDiscount(0);
      setTax(0);
      setNote("");
      setPaymentAmount(0);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت فاکتور");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-md border p-3">
            <div className="min-w-40 flex-1 space-y-1">
              <Label>محصول</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={item.productId}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onProductChange(index, e.target.value)}
              >
                <option value="">— انتخاب کنید —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (موجودی: {toPersianDigits(p.stock)})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24 space-y-1">
              <Label>تعداد</Label>
              <Input
                type="number"
                min={1}
                dir="ltr"
                value={item.qty}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(index, { qty: Number(e.target.value) })}
              />
            </div>
            <div className="w-36 space-y-1">
              <Label>قیمت واحد</Label>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={item.unitPrice}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(index, { unitPrice: Number(e.target.value) })}
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              disabled={items.length === 1}
              title="حذف"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4" />
          افزودن آیتم
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>مشتری</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={customerId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCustomerId(e.target.value)}
          >
            <option value="">— مشتری حضوری —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label>تخفیف</Label>
          <Input type="number" min={0} dir="ltr" value={discount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDiscount(Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label>مالیات</Label>
          <Input type="number" min={0} dir="ltr" value={tax} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTax(Number(e.target.value))} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>پرداخت اولیه (اختیاری)</Label>
          <Input
            type="number"
            min={0}
            dir="ltr"
            value={paymentAmount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(Number(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>روش پرداخت</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={paymentMethod}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPaymentMethod(e.target.value as typeof paymentMethod)}
          >
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label>یادداشت</Label>
        <Input value={note} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNote(e.target.value)} placeholder="اختیاری" />
      </div>

      <div className="rounded-md border bg-muted/40 p-3 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">جمع کل:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>مبلغ قابل پرداخت:</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>
      ) : null}

      <Button onClick={onSubmit} disabled={busy}>
        {busy ? "در حال ثبت..." : "ثبت فاکتور فروش"}
      </Button>
    </div>
  );
}
