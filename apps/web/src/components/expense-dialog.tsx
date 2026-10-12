"use client";

import * as React from "react";
import { Wallet } from "lucide-react";

import type { ExpenseCategory } from "@my-store/shared-types";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@my-store/ui-kit/components/dialog";

import { ExpenseForm } from "./expense-form";

export function ExpenseDialog({ categories }: { categories: ExpenseCategory[] }) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wallet className="size-4" />
          هزینه جدید
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ثبت هزینه</DialogTitle>
          <DialogDescription>مبلغ از صندوق کم و در حساب هزینه بدهکار می‌شود.</DialogDescription>
        </DialogHeader>
        <ExpenseForm categories={categories} onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
