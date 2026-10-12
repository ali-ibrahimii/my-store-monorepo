"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Plus, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createInvoice } from "@my-store/api-client";
import { Alert, AlertDescription } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Field, FieldLabel } from "@my-store/ui-kit/components/field";
import { Input } from "@my-store/ui-kit/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@my-store/ui-kit/components/select";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { Textarea } from "@my-store/ui-kit/components/textarea";
import {
  formatCurrency,
  PAYMENT_METHOD_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";
import type { Customer, Product } from "@my-store/shared-types";

interface InvoiceFormProps {
  products: Pick<Product, "id" | "name" | "salePrice" | "stock">[];
  customers: Pick<Customer, "id" | "name">[];
  /** صندوق‌دار قیمت و تخفیف را عوض نمی‌کند */
  lockPrices?: boolean;
  taxRate?: number;
  onCreated?: () => void;
}

interface ItemRow {
  productId: string;
  qty: number;
  unitPrice: number;
}

const EMPTY_ROW: ItemRow = { productId: "", qty: 1, unitPrice: 0 };

export function InvoiceForm({
  products,
  customers,
  lockPrices = false,
  taxRate = 0,
  onCreated,
}: InvoiceFormProps) {
  const router = useRouter();
  const [items, setItems] = React.useState<ItemRow[]>([{ ...EMPTY_ROW }]);
  const [customerId, setCustomerId] = React.useState("");
  const [discount, setDiscount] = React.useState(0);
  const [tax, setTax] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [paymentAmount, setPaymentAmount] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState<
    "CASH" | "CARD" | "TRANSFER" | "CREDIT"
  >("CASH");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const subtotal = React.useMemo(
    () => items.reduce((sum, item) => sum + (item.qty * item.unitPrice || 0), 0),
    [items],
  );
  const effectiveDiscount = lockPrices ? 0 : discount;
  const effectiveTax = lockPrices ? Math.round((subtotal * taxRate) / 100) : tax;
  const total = Math.max(0, subtotal - effectiveDiscount + effectiveTax);

  function updateItem(index: number, patch: Partial<ItemRow>) {
    setItems((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ROW }]);
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
    const validItems = items.filter((item) => item.productId && item.qty > 0);
    if (validItems.length === 0) {
      setError("حداقل یک آیتم معتبر انتخاب کنید");
      return;
    }
    setBusy(true);
    try {
      await createInvoice({
        customerId: customerId || undefined,
        items: validItems,
        discount: effectiveDiscount,
        tax: effectiveTax,
        note: note || undefined,
        issueNow: true,
        ...(paymentAmount > 0
          ? { payment: { method: paymentMethod, amount: paymentAmount } }
          : {}),
      });
      setItems([{ ...EMPTY_ROW }]);
      setCustomerId("");
      setDiscount(0);
      setTax(0);
      setNote("");
      setPaymentAmount(0);
      toast.success("فاکتور ثبت شد");
      onCreated?.();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت فاکتور");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="bg-muted/30 grid gap-3 rounded-lg border p-3 sm:grid-cols-[2fr_5rem_7rem_auto] sm:items-end"
          >
            <Field>
              <FieldLabel>محصول</FieldLabel>
              <Select
                value={item.productId || "NONE"}
                onValueChange={(value) =>
                  onProductChange(index, value === "NONE" ? "" : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">— انتخاب کنید —</SelectItem>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (موجودی: {toPersianDigits(product.stock)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>تعداد</FieldLabel>
              <Input
                type="number"
                min={1}
                dir="ltr"
                value={item.qty}
                onChange={(event) =>
                  updateItem(index, { qty: Number(event.target.value) })
                }
              />
            </Field>
            <Field>
              <FieldLabel>قیمت واحد</FieldLabel>
              <Input
                type="number"
                min={0}
                dir="ltr"
                value={item.unitPrice}
                readOnly={lockPrices}
                onChange={(event) =>
                  updateItem(index, { unitPrice: Number(event.target.value) })
                }
              />
            </Field>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => removeItem(index)}
              disabled={items.length === 1}
              title="حذف ردیف"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" type="button" onClick={addItem}>
          <Plus className="size-4" />
          افزودن آیتم
        </Button>
      </div>

      <Separator />

      <div className="grid gap-4 sm:grid-cols-3">
        <Field>
          <FieldLabel>مشتری</FieldLabel>
          <Select
            value={customerId || "NONE"}
            onValueChange={(value) => setCustomerId(value === "NONE" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="مشتری حضوری" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">— مشتری حضوری —</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>تخفیف (تومان)</FieldLabel>
          <Input
            type="number"
            min={0}
            dir="ltr"
            value={lockPrices ? 0 : discount}
            readOnly={lockPrices}
            onChange={(event) => setDiscount(Number(event.target.value))}
          />
        </Field>
        <Field>
          <FieldLabel>مالیات (تومان)</FieldLabel>
          <Input
            type="number"
            min={0}
            dir="ltr"
            value={lockPrices ? effectiveTax : tax}
            readOnly={lockPrices}
            onChange={(event) => setTax(Number(event.target.value))}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>پرداخت اولیه (اختیاری)</FieldLabel>
          <Input
            type="number"
            min={0}
            dir="ltr"
            value={paymentAmount}
            onChange={(event) => setPaymentAmount(Number(event.target.value))}
            placeholder="0"
          />
        </Field>
        <Field>
          <FieldLabel>روش پرداخت</FieldLabel>
          <Select
            value={paymentMethod}
            onValueChange={(value) =>
              setPaymentMethod(value as typeof paymentMethod)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field>
        <FieldLabel>یادداشت</FieldLabel>
        <Textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="اختیاری"
          rows={2}
        />
      </Field>

      <Card className="bg-muted/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">جمع فاکتور</CardTitle>
          <CardDescription>مبالغ به تومان محاسبه می‌شود.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">جمع کل</span>
            <span className="tabular-nums">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">تخفیف</span>
            <span className="tabular-nums">{formatCurrency(discount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">مالیات</span>
            <span className="tabular-nums">{formatCurrency(tax)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between font-bold">
            <span>مبلغ قابل پرداخت</span>
            <span className="text-primary tabular-nums">{formatCurrency(total)}</span>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button onClick={onSubmit} disabled={busy} className="w-full sm:w-auto">
        {busy ? <Spinner /> : <Receipt className="size-4" />}
        {busy ? "در حال ثبت…" : "ثبت فاکتور فروش"}
      </Button>
    </div>
  );
}
