import { Receipt } from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";

import { InvoiceDialog } from "@/components/invoice-dialog";
import { InvoicesLive } from "@/components/invoices-live";
import { PageHeader } from "@/components/page-header";
import { requirePageUser } from "@/lib/auth";
import { getLiveCart, getStore, listInvoiceHeads } from "@/lib/repositories";
import { toPersianDigits } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "فاکتورها" };

export default async function InvoicesPage() {
  const user = await requirePageUser();

  // بار اول: سه کوئری سبک و موازی (قبلاً سه کوئری سنگین با joinهای تودرتو بود)
  const [invoices, cart, store] = await Promise.all([
    listInvoiceHeads(user.storeId, { limit: 50 }),
    getLiveCart(user.storeId),
    getStore(user.storeId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="فاکتورهای فروش"
        description="فاکتور گوشی همان لحظه اینجا ظاهر می‌شود؛ با دکمه‌ی چاپ، رسید را به مشتری بدهید."
      >
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {toPersianDigits(invoices.length)} فاکتور اخیر
        </Badge>
        <InvoiceDialog lockPrices={user.role !== "ADMIN"} taxRate={store?.taxRate ?? 0} />
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="size-4" />
            لیست فاکتورها
          </CardTitle>
          <CardDescription>
            جست‌وجوی شماره یا مشتری و فیلتر وضعیت — به‌روزرسانی خودکار و لحظه‌ای
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoicesLive
            storeId={user.storeId}
            initialInvoices={invoices}
            initialCart={cart}
            notify={user.role === "ADMIN"}
          />
        </CardContent>
      </Card>
    </div>
  );
}
