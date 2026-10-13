import { ScanLine, Smartphone } from "lucide-react";

import { requirePageUser } from "@/lib/auth";

import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { PageHeader } from "@/components/page-header";
import { ScanFeed } from "@/components/scan-feed";
import { ScannerDynamic } from "@/components/scanner-dynamic";

export const metadata = { title: "اسکنر" };

const SCANNER_URL = process.env.NEXT_PUBLIC_SCANNER_URL?.trim() ?? "";

export default async function ScanPage() {
  const user = await requirePageUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="اسکنر بارکد"
        description="با دوربین این دستگاه یا با اپ گوشی اسکن کنید — نتیجه همان لحظه روی همه دستگاه‌ها دیده می‌شود."
      >
        <Badge variant="secondary" className="gap-1">
          <ScanLine className="size-3" />
          PWA — قابل نصب روی گوشی
        </Badge>
      </PageHeader>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-4" />
            فروش با گوشی: اسکن کن، بعد یک‌جا فاکتور بزن
          </CardTitle>
          <CardDescription className="text-xs leading-6">
            ۱) اپ اسکنر را روی گوشی باز کن و وارد شو. ۲) اقلام را اسکن کن — در
            «سبد فاکتور» جمع می‌شوند و همین‌جا به‌صورت زنده دیده می‌شوند.
            ۳) کلید «ثبت فاکتور» را بزن؛ فاکتور در بخش فاکتورها می‌آید و از
            همان‌جا چاپ می‌شود.
          </CardDescription>
        </CardHeader>
        {SCANNER_URL ? (
          <CardContent className="pt-0">
            <Button size="sm" asChild>
              <a href={SCANNER_URL} target="_blank" rel="noreferrer">
                <Smartphone className="size-4" />
                باز کردن اپ اسکنر گوشی
              </a>
            </Button>
          </CardContent>
        ) : null}
      </Card>

      <ScannerDynamic role={user.role} />

      <ScanFeed storeId={user.storeId} />
    </div>
  );
}
