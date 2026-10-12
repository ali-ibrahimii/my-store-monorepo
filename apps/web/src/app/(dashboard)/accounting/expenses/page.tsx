import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { formatCurrency } from "@my-store/shared-utils";

import { ExpenseForm } from "@/components/expense-form";
import { ExpensesTable, type ExpenseRow } from "@/components/expenses-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { auth } from "@/lib/auth";
import { listAllExpenses, listExpenseCategories } from "@/lib/repositories";
import { sumAllExpenses } from "@/lib/stats";

export const dynamic = "force-dynamic";

export const metadata = { title: "هزینه‌ها" };

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const [expenses, categories, totalAmount] = await Promise.all([
    listAllExpenses(storeId, 100),
    listExpenseCategories(storeId),
    sumAllExpenses(storeId),
  ]);

  const rows: ExpenseRow[] = expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    categoryName: expense.category?.name ?? null,
    date: expense.date,
    amount: Number(expense.amount),
    note: expense.note ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="هزینه‌ها" description="هزینه‌های جاری فروشگاه" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="جمع کل هزینه‌ها"
          value={formatCurrency(totalAmount)}
          hint="از ابتدای فعالیت فروشگاه"
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          title="تعداد رکوردها"
          value={String(expenses.length)}
          hint="آخرین ۱۰۰ هزینه"
          icon={Wallet}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" />
              لیست هزینه‌ها
            </CardTitle>
            <CardDescription>جست‌وجو بر اساس عنوان، دسته یا یادداشت</CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesTable expenses={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ثبت هزینه جدید</CardTitle>
            <CardDescription>
              هر هزینه به‌صورت خودکار در دفتر کل ثبت می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpenseForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
