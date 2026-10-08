import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ExpenseForm } from "@/components/expense-form";
import { Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import { formatCurrency, formatDateJalali } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "هزینه‌ها" };

export default async function ExpensesPage() {
  const session = await auth();
  const storeId = session!.user.storeId;

  const [expenses, categories, totalRow] = await Promise.all([
    prisma.expense.findMany({
      where: { storeId },
      include: { category: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.expenseCategory.findMany({ where: { storeId }, orderBy: { name: "asc" } }),
    prisma.expense.aggregate({ where: { storeId }, _sum: { amount: true } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">هزینه‌ها</h1>
        <p className="text-muted-foreground text-sm">
          جمع کل: {formatCurrency(Number(totalRow._sum.amount ?? 0))}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>لیست هزینه‌ها</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-muted-foreground text-sm">هنوز هزینه‌ای ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-muted-foreground">
                      <th className="p-2 font-medium">عنوان</th>
                      <th className="p-2 font-medium">دسته</th>
                      <th className="p-2 font-medium">تاریخ</th>
                      <th className="p-2 font-medium">مبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((e: any) => (
                      <tr key={e.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{e.title}</td>
                        <td className="p-2 text-muted-foreground">{e.category?.name ?? "—"}</td>
                        <td className="p-2 text-muted-foreground">{formatDateJalali(e.date)}</td>
                        <td className="p-2">{formatCurrency(Number(e.amount))}</td>
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
            <CardTitle>ثبت هزینه جدید</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
