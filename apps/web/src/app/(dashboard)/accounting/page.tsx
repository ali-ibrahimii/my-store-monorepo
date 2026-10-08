import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { InvoiceForm } from "@/components/invoice-form";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import {
  formatCurrency,
  formatDateJalali,
  INVOICE_STATUS_LABELS,
  toPersianDigits,
} from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const session = await auth();
  const storeId = session!.user.storeId;

  const [invoices, products, customers] = await Promise.all([
    prisma.invoice.findMany({
      where: { storeId },
      include: { customer: true, items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.product.findMany({
      where: { storeId },
      select: { id: true, name: true, salePrice: true, stock: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { storeId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">فاکتورهای فروش</h1>
        <p className="text-muted-foreground text-sm">ثبت فروش — موجودی و حساب‌داری خودکار به‌روز می‌شود</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>آخرین فاکتورها</CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm">هنوز فاکتوری ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-muted-foreground">
                      <th className="p-2 font-medium">شماره</th>
                      <th className="p-2 font-medium">مشتری</th>
                      <th className="p-2 font-medium">تاریخ</th>
                      <th className="p-2 font-medium">مبلغ</th>
                      <th className="p-2 font-medium">پرداخت‌شده</th>
                      <th className="p-2 font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b last:border-0">
                        <td className="p-2 font-medium" dir="ltr">{inv.number}</td>
                        <td className="p-2">{inv.customer?.name ?? "حضوری"}</td>
                        <td className="p-2 text-muted-foreground">{formatDateJalali(inv.createdAt)}</td>
                        <td className="p-2">{formatCurrency(Number(inv.total))}</td>
                        <td className="p-2">{formatCurrency(Number(inv.paidAmount))}</td>
                        <td className="p-2">
                          <Badge
                            variant={
                              inv.status === "PAID"
                                ? "success"
                                : inv.status === "CANCELLED"
                                  ? "destructive"
                                  : inv.status === "DRAFT"
                                    ? "secondary"
                                    : "warning"
                            }
                          >
                            {INVOICE_STATUS_LABELS[inv.status] ?? inv.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>فاکتور جدید</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceForm
              products={products.map((p) => ({
                id: p.id,
                name: p.name,
                salePrice: Number(p.salePrice),
                stock: p.stock,
              }))}
              customers={customers}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
