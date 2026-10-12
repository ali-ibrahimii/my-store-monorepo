"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { createPurchase } from "@my-store/api-client";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@my-store/ui-kit/components/dialog";
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
import { formatCurrency, formatDateJalali, toPersianDigits } from "@my-store/shared-utils";

interface ProductOption {
  id: string;
  name: string;
  stock: number;
  costPrice: number;
}

interface PurchaseRow {
  id: string;
  number: string;
  supplier: string | null;
  total: number;
  paidAmount: number;
  createdAt: string;
}

interface Line {
  productId: string;
  qty: number;
  unitCost: number;
}

export function PurchasesPanel({
  products,
  purchases,
}: {
  products: ProductOption[];
  purchases: PurchaseRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [supplier, setSupplier] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState(0);
  const [lines, setLines] = React.useState<Line[]>([{ productId: "", qty: 1, unitCost: 0 }]);

  const total = lines.reduce((sum, line) => sum + line.qty * line.unitCost, 0);

  function setLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const items = lines.filter((line) => line.productId && line.qty > 0);
    if (items.length === 0) {
      toast.error("حداقل یک قلم انتخاب کنید");
      return;
    }
    setBusy(true);
    try {
      await createPurchase({ supplier, paidAmount, items });
      toast.success("فاکتور خرید ثبت شد");
      setOpen(false);
      setLines([{ productId: "", qty: 1, unitCost: 0 }]);
      setSupplier("");
      setPaidAmount(0);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ثبت خرید ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>فاکتورهای خرید</CardTitle>
          <CardDescription>ورود کالا به انبار و به‌روزرسانی قیمت خرید</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}>
          <ShoppingCart className="size-4" />
          خرید جدید
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شماره</TableHead>
                <TableHead>تأمین‌کننده</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>مبلغ</TableHead>
                <TableHead>پرداخت‌شده</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center">
                    هنوز خریدی ثبت نشده
                  </TableCell>
                </TableRow>
              ) : (
                purchases.map((purchase) => (
                  <TableRow key={purchase.id}>
                    <TableCell dir="ltr">{purchase.number}</TableCell>
                    <TableCell>{purchase.supplier ?? "—"}</TableCell>
                    <TableCell>{formatDateJalali(purchase.createdAt)}</TableCell>
                    <TableCell>{formatCurrency(purchase.total)}</TableCell>
                    <TableCell>{formatCurrency(purchase.paidAmount)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ثبت خرید</DialogTitle>
            <DialogDescription>
              جمع: {formatCurrency(total)} — اگر کمتر پرداخت کنید، مابقی حساب پرداختنی می‌شود.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="supplier">تأمین‌کننده</Label>
                <Input id="supplier" value={supplier} onChange={(event) => setSupplier(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paid">مبلغ پرداخت‌شده</Label>
                <Input
                  id="paid"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={paidAmount}
                  onChange={(event) => setPaidAmount(Number(event.target.value))}
                />
              </div>
            </div>
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[2fr_5rem_7rem_auto]">
                <Select
                  value={line.productId || "NONE"}
                  onValueChange={(value) => {
                    const product = products.find((item) => item.id === value);
                    setLine(index, {
                      productId: value === "NONE" ? "" : value,
                      unitCost: product ? product.costPrice : line.unitCost,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="کالا" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">انتخاب کالا</SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({toPersianDigits(product.stock)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  dir="ltr"
                  value={line.qty}
                  onChange={(event) => setLine(index, { qty: Number(event.target.value) })}
                />
                <Input
                  type="number"
                  min={0}
                  dir="ltr"
                  value={line.unitCost}
                  onChange={(event) => setLine(index, { unitCost: Number(event.target.value) })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLines((prev) => [...prev, { productId: "", qty: 1, unitCost: 0 }])}
            >
              <Plus className="size-4" />
              قلم
            </Button>
            <DialogFooter>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : null}
                ثبت خرید
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
