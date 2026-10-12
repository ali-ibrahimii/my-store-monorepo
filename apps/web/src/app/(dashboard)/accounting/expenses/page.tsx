import { Wallet } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { formatCurrency } from "@my-store/shared-utils";

import { ExpenseDialog } from "@/components/expense-dialog";
import { ExpensesTable, type ExpenseRow } from "@/components/expenses-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireAdminPage } from "@/lib/auth";
import { listAllExpenses, listExpenseCategories } from "@/lib/repositories";
import { sumAllExpenses } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const metadata = { title: "هزینه‌ها" };

export default async function ExpensesPage() {
  const user = await requireAdminPage();
  const [expenses, categories, totalAmount] = await Promise.all([
    listAllExpenses(user.storeId, 100),
    listExpenseCategories(user.storeId),
    sumAllExpenses(user.storeId),
  ]);
  const rows: ExpenseRow[] = expenses.map((expense) => ({
    id: expense.id,
    title: expense.title,
    categoryName: expense.category?.name ?? null,
    date: expense.date,
    amount: Number(expense.amount),
    note: expense.note,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="هزینه‌ها" description="فقط مدیر — هر هزینه یک سند دوطرفه در دفتر کل می‌سازد">
        <ExpenseDialog categories={categories} />
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard title="جمع هزینه‌ها" value={formatCurrency(totalAmount)} icon={Wallet} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>لیست هزینه‌ها</CardTitle>
          <CardDescription>ثبت هزینه از دیالوگ، نه فرم کنار جدول</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpensesTable expenses={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
