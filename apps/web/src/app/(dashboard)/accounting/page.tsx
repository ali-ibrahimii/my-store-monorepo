import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";

import { InvoiceForm } from "@/components/invoice-form";
import { InvoicesTable, type InvoiceRow } from "@/components/invoices-table";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { listAllProducts, listCustomers, listInvoices } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export const metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const [invoicePage, products, customers] = await Promise.all([
    listInvoices(storeId, { page: 1, pageSize: 50 }),
    listAllProducts(storeId),
    listCustomers(storeId),
  ]);

  const rows: InvoiceRow[] = invoicePage.items.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    customerName: invoice.customer?.name ?? null,
    createdAt: invoice.createdAt,
    total: Number(invoice.total),
    paidAmount: Number(invoice.paidAmount),
    status: invoice.status,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="فاکتورهای فروش"
        description="ثبت فروش — موجودی انبار و حساب‌داری خودکار به‌روز می‌شود"
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-4" />
              آخرین فاکتورها
            </CardTitle>
            <CardDescription>
              جست‌وجو بر اساس شماره فاکتور یا مشتری، فیلتر بر اساس وضعیت
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoicesTable invoices={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>فاکتور جدید</CardTitle>
            <CardDescription>
              آیتم‌ها را اضافه کنید؛ جمع، تخفیف و مالیات خودکار محاسبه می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoiceForm
              products={products.map((product) => ({
                id: product.id,
                name: product.name,
                salePrice: Number(product.salePrice),
                stock: Number(product.stock),
              }))}
              customers={customers.map((customer) => ({
                id: customer.id,
                name: customer.name,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
