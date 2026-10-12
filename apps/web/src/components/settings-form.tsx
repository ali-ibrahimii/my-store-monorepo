"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { updateStoreSettings } from "@my-store/api-client";
import type { Store } from "@my-store/shared-types";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Input } from "@my-store/ui-kit/components/input";
import { Label } from "@my-store/ui-kit/components/label";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import { Textarea } from "@my-store/ui-kit/components/textarea";

export function SettingsForm({ store }: { store: Store }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await updateStoreSettings({
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        address: String(form.get("address") ?? ""),
        email: String(form.get("email") ?? ""),
        currency: String(form.get("currency") ?? "IRR"),
        taxRate: Number(form.get("taxRate") ?? 0),
        invoicePrefix: String(form.get("invoicePrefix") ?? "INV"),
        receiptFooter: String(form.get("receiptFooter") ?? ""),
        lowStockDefault: Number(form.get("lowStockDefault") ?? 5),
      });
      toast.success("تنظیمات فروشگاه ذخیره شد");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ذخیره ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>هویت فروشگاه</CardTitle>
        <CardDescription>این مقادیر روی فاکتور، سایدبار و محاسبه‌ی مالیات صندوق اثر می‌گذارند.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">نام فروشگاه</Label>
            <Input id="name" name="name" required defaultValue={store.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">تلفن</Label>
            <Input id="phone" name="phone" dir="ltr" defaultValue={store.phone ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">ایمیل فروشگاه</Label>
            <Input id="email" name="email" dir="ltr" defaultValue={store.email ?? ""} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">آدرس</Label>
            <Input id="address" name="address" defaultValue={store.address ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">واحد پول</Label>
            <Input id="currency" name="currency" dir="ltr" defaultValue={store.currency} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="taxRate">مالیات پیش‌فرض (درصد)</Label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              min={0}
              max={100}
              step="0.01"
              dir="ltr"
              defaultValue={store.taxRate}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invoicePrefix">پیشوند فاکتور</Label>
            <Input
              id="invoicePrefix"
              name="invoicePrefix"
              dir="ltr"
              defaultValue={store.invoicePrefix}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lowStockDefault">حد پیش‌فرض کم‌موجودی</Label>
            <Input
              id="lowStockDefault"
              name="lowStockDefault"
              type="number"
              min={0}
              dir="ltr"
              defaultValue={store.lowStockDefault}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="receiptFooter">متن پایین رسید</Label>
            <Textarea
              id="receiptFooter"
              name="receiptFooter"
              defaultValue={store.receiptFooter ?? ""}
              placeholder="مثلاً از خرید شما متشکریم"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>
              {busy ? <Spinner /> : <Save className="size-4" />}
              ذخیره تنظیمات
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
