import { ScanLine } from "lucide-react";

import { requirePageUser } from "@/lib/auth";

import { Badge } from "@my-store/ui-kit/components/badge";
import { PageHeader } from "@/components/page-header";
import { ScanFeed } from "@/components/scan-feed";
import { ScannerDynamic } from "@/components/scanner-dynamic";

export const metadata = { title: "اسکنر" };

export default async function ScanPage() {
  const user = await requirePageUser();
  return (
    <div className="space-y-6">
      <PageHeader
        title="اسکنر بارکد"
        description="با دوربین گوشی محصول را اسکن کنید — ثبت فوری انجام می‌شود و روی همه دستگاه‌ها به‌صورت لحظه‌ای نمایش داده می‌شود."
      >
        <Badge variant="secondary" className="gap-1">
          <ScanLine className="size-3" />
          PWA — قابل نصب روی گوشی
        </Badge>
      </PageHeader>

      <ScannerDynamic role={user.role} />

      <ScanFeed />
    </div>
  );
}
