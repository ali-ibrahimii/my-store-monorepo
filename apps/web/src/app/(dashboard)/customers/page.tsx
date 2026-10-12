import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { toPersianDigits } from "@my-store/shared-utils";

import { CustomersTable, type CustomerRow } from "@/components/customers-table";
import { CustomerForm } from "@/components/customer-form";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { listCustomers } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export const metadata = { title: "مشتریان" };

export default async function CustomersPage() {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const customers = await listCustomers(storeId);

  const rows: CustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone ?? null,
    address: customer.address ?? null,
    balance: Number(customer.balance),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="مشتریان"
        description={`${toPersianDigits(customers.length)} مشتری ثبت شده`}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              لیست مشتریان
            </CardTitle>
            <CardDescription>
              مانده حساب هر مشتری از فاکتورهای اعتباری به‌روز می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomersTable customers={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مشتری جدید</CardTitle>
            <CardDescription>
              برای فروش اعتباری، مشتری را با نام و تلفن ثبت کنید.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
