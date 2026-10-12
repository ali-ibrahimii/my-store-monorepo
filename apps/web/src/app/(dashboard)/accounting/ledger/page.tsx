import { PageHeader } from "@/components/page-header";
import { requireAdminPage } from "@/lib/auth";
import { listLedger } from "@/lib/repositories";
import { LEDGER_ACCOUNT_LABELS, formatCurrency, formatDateJalali } from "@my-store/shared-utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";
import { Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit/components/card";

export const dynamic = "force-dynamic";
export const metadata = { title: "دفتر کل" };

type PageProps = { searchParams: Promise<{ account?: string }> };

export default async function LedgerPage({ searchParams }: PageProps) {
  const user = await requireAdminPage();
  const params = await searchParams;
  const entries = await listLedger(user.storeId, {
    account: params.account || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="دفتر کل"
        description="اسناد دوطرفه فاکتور، پرداخت، هزینه و خرید"
      />
      <Card>
        <CardHeader>
          <CardTitle>آخرین اسناد</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form className="flex flex-wrap gap-2">
            <select
              name="account"
              defaultValue={params.account ?? ""}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">همه حساب‌ها</option>
              {Object.entries(LEDGER_ACCOUNT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button className="bg-primary text-primary-foreground h-9 rounded-md px-3 text-sm" type="submit">
              فیلتر
            </button>
          </form>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>تاریخ</TableHead>
                  <TableHead>حساب</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>مبلغ</TableHead>
                  <TableHead>شرح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{formatDateJalali(entry.date)}</TableCell>
                    <TableCell>{LEDGER_ACCOUNT_LABELS[entry.account] ?? entry.account}</TableCell>
                    <TableCell>{entry.type === "DEBIT" ? "بدهکار" : "بستانکار"}</TableCell>
                    <TableCell>{formatCurrency(entry.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{entry.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
