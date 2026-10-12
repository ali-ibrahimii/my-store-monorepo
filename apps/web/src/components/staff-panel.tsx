"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createStaff, setStaffActive } from "@my-store/api-client";
import type { StaffMember } from "@my-store/shared-types";
import { Badge } from "@my-store/ui-kit/components/badge";
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
import { ROLE_LABELS } from "@my-store/shared-utils";
import { Spinner } from "@my-store/ui-kit/components/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";

export function StaffPanel({
  members,
  currentUserId,
}: {
  members: StaffMember[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await createStaff({
        name: String(form.get("name") ?? ""),
        email: String(form.get("email") ?? ""),
        password: String(form.get("password") ?? ""),
      });
      toast.success("حساب صندوق‌دار ساخته شد");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "ساخت حساب ناموفق بود");
    } finally {
      setBusy(false);
    }
  }

  async function toggle(member: StaffMember) {
    try {
      await setStaffActive(member.id, !member.active);
      toast.success(member.active ? "حساب غیرفعال شد" : "حساب فعال شد");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>اعضای فروشگاه</CardTitle>
          <CardDescription>حساب جدید همیشه نقش صندوق‌دار می‌گیرد.</CardDescription>
        </div>
        <Button onClick={() => setOpen(true)}>
          <UserPlus className="size-4" />
          صندوق‌دار جدید
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name ?? "—"}</TableCell>
                  <TableCell dir="ltr" className="text-xs">
                    {member.email}
                  </TableCell>
                  <TableCell>{ROLE_LABELS[member.role] ?? member.role}</TableCell>
                  <TableCell>
                    <Badge variant={member.active ? "secondary" : "warning"}>
                      {member.active ? "فعال" : "غیرفعال"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {member.role === "CASHIER" && member.id !== currentUserId ? (
                      <Button variant="outline" size="sm" onClick={() => toggle(member)}>
                        {member.active ? "غیرفعال" : "فعال"}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>صندوق‌دار جدید</DialogTitle>
            <DialogDescription>
              رمز را به صندوق‌دار بدهید. او نمی‌تواند قیمت، تنظیمات یا گزارش سود را ببیند.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">نام</Label>
              <Input id="staff-name" name="name" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-email">ایمیل</Label>
              <Input id="staff-email" name="email" type="email" dir="ltr" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">رمز عبور</Label>
              <Input id="staff-password" name="password" type="password" dir="ltr" minLength={6} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Spinner /> : null}
                ساخت حساب
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
