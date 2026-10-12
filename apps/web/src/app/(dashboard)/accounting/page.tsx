import { Receipt } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";

import { InvoiceDialog } from "@/components/invoice-dialog";
import { InvoicesTable, type InvoiceRow } from "@/components/invoices-table";
import { PageHeader } from "@/components/page-header";
import { requirePageUser } from "@/lib/auth";
import { getStore, listAllProducts, listCustomers, listInvoices } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const user = await requirePageUser();
  const [invoicePage, products, customers, store] = await Promise.all([
    listInvoices(user.storeId, { page: 1, pageSize: 100 }),
    listAllProducts(user.storeId),
    listCustomers(user.storeId),
    getStore(user.storeId),
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
        description="صدور فاکتور موجودی، مانده مشتری و دفتر کل را با هم به‌روز می‌کند"
      >
        <InvoiceDialog
          lockPrices={user.role !== "ADMIN"}
          taxRate={store?.taxRate ?? 0}
          products={products.map((product) => ({
            id: product.id,
            name: product.name,
            salePrice: Number(product.salePrice),
            stock: Number(product.stock),
          }))}
          customers={customers.map((customer) => ({ id: customer.id, name: customer.name }))}
        />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            لیست فاکتورها
          </CardTitle>
          <CardDescription>جست‌وجوی شماره یا مشتری و فیلتر وضعیت</CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesTable invoices={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
