import Link from "next/link";
import { AlertCircle, DatabaseZap } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Separator } from "@my-store/ui-kit/components/separator";

/**
 * پیام دوستانه وقتی دیتابیس در دسترس نیست (فقط محیط توسعه).
 * به‌جای صفحه‌ی خالی/خطای خام، دقیقاً می‌گوید چه کاری لازم است.
 */
export function DbOfflineNotice({ detail }: { detail?: string }) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-xl">
          <DatabaseZap className="size-5" />
        </div>
        <CardTitle>دیتابیس در دسترس نیست</CardTitle>
        <CardDescription>
          وب‌اپ بالا آمده، ولی به MongoDB وصل نمی‌شود؛ به همین دلیل صفحه‌ها و ورود
          کار نمی‌کنند.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>سریع‌ترین راه</AlertTitle>
          <AlertDescription>
            <p>
              در ریشه‌ی پروژه <code dir="ltr">pnpm dev</code> را اجرا کنید — دیتابیس
              توسعه را خودش بالا می‌آورد.
            </p>
            <p>
              یا جداگانه: <code dir="ltr">pnpm db:sandbox</code> (بدون Docker) ·{" "}
              <code dir="ltr">pnpm docker:up</code> (MongoDB واقعی)
            </p>
          </AlertDescription>
        </Alert>

        {detail ? (
          <>
            <Separator />
            <pre
              className="bg-muted overflow-auto rounded-md p-3 text-xs"
              dir="ltr"
            >
              {detail}
            </pre>
          </>
        ) : null}

        <Button asChild variant="outline" size="sm">
          <Link href="/api/health" target="_blank">
            بررسی وضعیت دیتابیس
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
