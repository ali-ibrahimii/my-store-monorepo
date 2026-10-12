"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Search, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { createCustomer, deleteCustomer, updateCustomer } from "@my-store/api-client";
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
import { Textarea } from "@my-store/ui-kit/components/textarea";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  note: string | null;
  balance: number;
}

type Draft = {
  id?: string;
  name: string;
  phone: string;
  address: string;
  note: string;
};

const emptyDraft = (): Draft => ({ name: "", phone: "", address: "", note: "" });

export function CustomersPanel({
  customers,
  canManage,
}: {
  customers: CustomerRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [balance, setBalance] = React.useState<"all" | "debt" | "clear">("all");
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [busy, setBusy] = React.useState(false);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesQuery =
        !q ||
        customer.name.toLowerCase().includes(q) ||
        (customer.phone ?? "").includes(q) ||
        (customer.address ?? "").toLowerCase().includes(q) ||
        (customer.note ?? "").toLowerCase().includes(q);
      const matchesBalance =
        balance === "all" ||
        (balance === "debt" && customer.balance > 0) ||
        (balance === "clear" && customer.balance <= 0);
      return matchesQuery && matchesBalance;
    });
  }, [customers, query, balance]);

  function openCreate() {
    setDraft(emptyDraft());
    setOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setDraft({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      note: customer.note ?? "",
    });
    setOpen(true);
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const payload = {
        name: draft.name,
        phone: draft.phone || undefined,
        address: draft.address || undefined,
        note: draft.note || undefined,
      };
      if (draft.id) await updateCustomer(draft.id, payload);
      else await createCustomer(payload);
      toast.success(draft.id ? "مشتری ویرایش شد" : "مشتری ثبت شد");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "خطا در ثبت مشتری");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(customer: CustomerRow) {
    if (!confirm(`مشتری «${customer.name}» حذف شود؟`)) return;
    try {
      await deleteCustomer(customer.id);
      toast.success("مشتری حذف شد");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حذف ممکن نشد");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی نام، تلفن، آدرس…"
            className="ps-9"
          />
        </div>
        <Select value={balance} onValueChange={(value) => setBalance(value as typeof balance)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه مانده‌ها</SelectItem>
            <SelectItem value="debt">بدهکار</SelectItem>
            <SelectItem value="clear">تسویه‌شده</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <UserPlus className="size-4" />
          مشتری جدید
        </Button>
      </div>

      <p className="text-muted-foreground text-xs">
        {toPersianDigits(filtered.length)} از {toPersianDigits(customers.length)} مشتری
      </p>

      {filtered.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle>مشتری‌ای پیدا نشد</EmptyTitle>
            <EmptyDescription>با دکمه «مشتری جدید» یک دیالوگ باز می‌شود.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>تلفن</TableHead>
                <TableHead>آدرس</TableHead>
                <TableHead>یادداشت</TableHead>
                <TableHead>مانده</TableHead>
                {canManage ? <TableHead className="w-24">عملیات</TableHead> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell dir="ltr" className="text-muted-foreground text-xs">
                    {customer.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.address ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-40 truncate">
                    {customer.note ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.balance > 0 ? "warning" : "secondary"}>
                      {formatCurrency(customer.balance)}
                    </Badge>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(customer)}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(customer)}>
                          <Trash2 className="text-destructive size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{draft.id ? "ویرایش مشتری" : "مشتری جدید"}</DialogTitle>
            <DialogDescription>
              اطلاعات طرف‌حساب جدا از لیست، در همین پنجره ثبت می‌شود.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">نام *</Label>
              <Input
                id="customer-name"
                required
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">تلفن</Label>
              <Input
                id="customer-phone"
                dir="ltr"
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-address">آدرس</Label>
              <Input
                id="customer-address"
                value={draft.address}
                onChange={(event) => setDraft({ ...draft, address: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-note">یادداشت</Label>
              <Textarea
                id="customer-note"
                value={draft.note}
                onChange={(event) => setDraft({ ...draft, note: event.target.value })}
              />
            </div>
            <DialogFooter>
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
