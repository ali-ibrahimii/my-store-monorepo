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

export function DbOfflineNotice({ detail }: { detail?: string }) {
  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-xl">
          <DatabaseZap className="size-5" />
        </div>
        <CardTitle>سوپابیس در دسترس نیست</CardTitle>
        <CardDescription>
          وب‌اپ بالا آمده، ولی به پروژه سوپابیس وصل نمی‌شود. ورود و داده‌ها تا وصل‌شدن کار نمی‌کنند.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="size-4" />
          <AlertTitle>راه‌اندازی</AlertTitle>
          <AlertDescription>
            <p>۱. در SQL Editor سوپابیس فایل supabase/migrations/0001_init.sql را اجرا کنید.</p>
            <p>
              ۲. در apps/web/.env.local مقدار NEXT_PUBLIC_SUPABASE_URL، کلید
              publishable (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) و کلید
              محرمانه‌ی سرور (SUPABASE_SECRET_KEY) را بگذارید. کلیدهای قدیمی
              anon و service_role هم پشتیبانی می‌شوند؛ کلید secret را در مرورگر
              قرار ندهید.
            </p>
            <p>۳. <code dir="ltr">pnpm db:seed</code> حساب مدیر و صندوق‌دار نمونه را می‌سازد.</p>
          </AlertDescription>
        </Alert>
        {detail ? (
          <>
            <Separator />
            <pre className="bg-muted overflow-auto rounded-md p-3 text-xs" dir="ltr">
              {detail}
            </pre>
          </>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href="/setup">راه‌اندازی و عیب‌یابی</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/api/health" target="_blank">
              بررسی وضعیت API
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
