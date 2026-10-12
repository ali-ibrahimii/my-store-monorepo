"use client";

import * as React from "react";
import { Receipt } from "lucide-react";

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

import { InvoiceForm } from "./invoice-form";

export function InvoiceDialog({
  products,
  customers,
  lockPrices,
  taxRate,
}: {
  products: Pick<Product, "id" | "name" | "salePrice" | "stock">[];
  customers: Pick<Customer, "id" | "name">[];
  lockPrices?: boolean;
  taxRate?: number;
}) {
  const [open, setOpen] = React.useState(false);
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
        <InvoiceForm
          products={products}
          customers={customers}
          lockPrices={lockPrices}
          taxRate={taxRate}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
