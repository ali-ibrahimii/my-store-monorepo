"use client";

import * as React from "react";
import { Receipt } from "lucide-react";

import { listCustomers, listProducts } from "@my-store/api-client";
import type { Customer, Product } from "@my-store/shared-types";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@my-store/ui-kit/components/dialog";
import { Spinner } from "@my-store/ui-kit/components/spinner";

import { InvoiceForm } from "./invoice-form";

type ProductOption = Pick<Product, "id" | "name" | "salePrice" | "stock">;
type CustomerOption = Pick<Customer, "id" | "name">;

export function InvoiceDialog({
  products: initialProducts,
  customers: initialCustomers,
  lockPrices,
  taxRate,
}: {
  products?: ProductOption[];
  customers?: CustomerOption[];
  lockPrices?: boolean;
  taxRate?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [products, setProducts] = React.useState<ProductOption[]>(initialProducts ?? []);
  const [customers, setCustomers] = React.useState<CustomerOption[]>(initialCustomers ?? []);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // کالاها و مشتری‌ها فقط وقتی دیالوگ باز می‌شود لود می‌شوند؛
  // این‌طور فهرست فاکتورها با یک درخواست سبک باز می‌شود، نه سه درخواست سنگین.
  React.useEffect(() => {
    if (!open || products.length > 0 || loading) return;
    let cancelled = false;

    // تأخیر صفر: شروع بارگذاری بیرون از بدنه‌ی effect (بدون رندر آبشاری)
    const start = setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
      Promise.all([listProducts({ pageSize: 500 }), listCustomers()])
        .then(([productPage, customerPage]) => {
          if (cancelled) return;
          setProducts(
            productPage.items.map((product) => ({
              id: product.id,
              name: product.name,
              salePrice: Number(product.salePrice),
              stock: Number(product.stock),
            })),
          );
          setCustomers(
            (customerPage.items ?? []).map((customer) => ({ id: customer.id, name: customer.name })),
          );
        })
        .catch((cause: unknown) => {
          if (!cancelled) {
            setError(cause instanceof Error ? cause.message : "بارگذاری کالاها ناموفق بود");
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, [open, products.length, loading]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Receipt className="size-4" />
          فاکتور جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>فاکتور فروش</DialogTitle>
          <DialogDescription>
            {lockPrices
              ? "قیمت فروش و تخفیف برای صندوق‌دار قفل است. مالیات از تنظیمات فروشگاه محاسبه می‌شود."
              : "قیمت واحد و تخفیف را مدیر می‌تواند تغییر دهد."}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <Spinner />
            در حال بارگذاری کالاها…
          </div>
        ) : error ? (
          <p className="text-destructive py-6 text-center text-sm">{error}</p>
        ) : (
          <InvoiceForm
            products={products}
            customers={customers}
            lockPrices={lockPrices}
            taxRate={taxRate}
            onCreated={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
