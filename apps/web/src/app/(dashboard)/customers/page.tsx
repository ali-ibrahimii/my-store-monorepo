import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { toPersianDigits } from "@my-store/shared-utils";

import { CustomersPanel, type CustomerRow } from "@/components/customers-panel";
import { PageHeader } from "@/components/page-header";
import { requirePageUser } from "@/lib/auth";
import { listCustomers } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "مشتریان" };

export default async function CustomersPage() {
  const user = await requirePageUser();
  const customers = await listCustomers(user.storeId);
  const rows: CustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    address: customer.address,
    note: customer.note ?? null,
    balance: Number(customer.balance),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان"
        description={`${toPersianDigits(customers.length)} طرف‌حساب — افزودن در دیالوگ، نه کنار جدول`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-4" />
            دفتر مشتریان
          </CardTitle>
          <CardDescription>
            جست‌وجو، فیلتر بدهکاران و ثبت مشتری جدید در پنجره‌ی جدا.
            {user.role !== "ADMIN" ? " ویرایش و حذف فقط برای مدیر است." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomersPanel customers={rows} canManage={user.role === "ADMIN"} />
        </CardContent>
      </Card>
    </div>
  );
}
