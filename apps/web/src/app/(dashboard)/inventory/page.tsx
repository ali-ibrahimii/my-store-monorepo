import { PageHeader } from "@/components/page-header";
import { requireAdminPage } from "@/lib/auth";
import { listMovements, oneName } from "@/lib/inventory-view";
import { MOVEMENT_TYPE_LABELS, formatDateJalali, toPersianDigits } from "@my-store/shared-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@my-store/ui-kit/components/table";

export const dynamic = "force-dynamic";
export const metadata = { title: "حرکت انبار" };

export default async function InventoryPage() {
  const user = await requireAdminPage();
  const movements = await listMovements(user.storeId);

  return (
    <div className="space-y-6">
      <PageHeader title="حرکت انبار" description="ورود، فروش، خرید و اصلاح موجودی" />
      <Card>
        <CardHeader>
          <CardTitle>آخرین حرکت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>زمان</TableHead>
                  <TableHead>کالا</TableHead>
                  <TableHead>نوع</TableHead>
                  <TableHead>تعداد</TableHead>
                  <TableHead>شرح</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id}>
                    <TableCell>{formatDateJalali(movement.created_at)}</TableCell>
                    <TableCell>{oneName(movement.products)}</TableCell>
                    <TableCell>{MOVEMENT_TYPE_LABELS[movement.type] ?? movement.type}</TableCell>
                    <TableCell dir="ltr">{toPersianDigits(movement.qty)}</TableCell>
                    <TableCell className="text-muted-foreground">{movement.note ?? "—"}</TableCell>
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
