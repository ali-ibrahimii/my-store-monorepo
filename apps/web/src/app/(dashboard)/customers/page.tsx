import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { CustomerForm } from "@/components/customer-form";
import { Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "مشتریان" };

export default async function CustomersPage() {
  const session = await auth();
  const storeId = session!.user.storeId;

  const customers = await prisma.customer.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">مشتریان</h1>
        <p className="text-muted-foreground text-sm">{toPersianDigits(customers.length)} مشتری ثبت شده</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>لیست مشتریان</CardTitle>
          </CardHeader>
          <CardContent>
            {customers.length === 0 ? (
              <p className="text-muted-foreground text-sm">هنوز مشتری‌ای ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-muted-foreground">
                      <th className="p-2 font-medium">نام</th>
                      <th className="p-2 font-medium">تلفن</th>
                      <th className="p-2 font-medium">آدرس</th>
                      <th className="p-2 font-medium">مانده</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c) => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{c.name}</td>
                        <td className="p-2" dir="ltr">{c.phone ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{c.address ?? "—"}</td>
                        <td className="p-2">{formatCurrency(Number(c.balance))}</td>
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
            <CardTitle>مشتری جدید</CardTitle>
          </CardHeader>
          <CardContent>
            <CustomerForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
