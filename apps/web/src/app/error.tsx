"use client";

// ============================================================
// مرز خطای سراسری — به‌جای صفحه‌ی سفید/«Application error»
//
// پرتکرارترین خطای محیط توسعه: MongoDB اجرا نشده است.
// پس همان‌جا راهنمای درست را نشان می‌دهیم.
// ============================================================

import { useEffect } from "react";
import { AlertCircle, RefreshCw, Stethoscope } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@my-store/ui-kit/components/alert";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] render error:", error);
  }, [error]);

  const message = error?.message ?? "";
  const looksLikeDb =
    /Mongo|ECONNREFUSED|ENOTFOUND|server selection|topology/i.test(message) ||
    /connect/i.test(message);

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="bg-destructive/10 text-destructive flex size-10 items-center justify-center rounded-xl">
            <AlertCircle className="size-5" />
          </div>
          <CardTitle>خطا در اجرای این صفحه</CardTitle>
          <CardDescription>
            جزئیات خطا در ترمینال سرور و کنسول مرورگر ثبت شده است.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {looksLikeDb ? (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>به احتمال زیاد دیتابیس در دسترس نیست</AlertTitle>
              <AlertDescription>
                <p>
                  ساده‌ترین راه: در ترمینال <code dir="ltr">pnpm dev</code> را اجرا
                  کنید — دیتابیس توسعه را خودش بالا می‌آورد.
                </p>
                <p>
                  یا جداگانه: <code dir="ltr">pnpm db:sandbox</code> (بدون Docker) ·{" "}
                  <code dir="ltr">pnpm docker:up</code> (MongoDB واقعی)
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <pre
            className="bg-muted max-h-40 overflow-auto rounded-md p-3 text-xs"
            dir="ltr"
          >
            {message || "Unknown error"}
          </pre>

          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              <RefreshCw className="size-4" />
              تلاش دوباره
            </Button>
            <Button variant="outline" asChild>
              <a href="/api/health" target="_blank" rel="noreferrer">
                <Stethoscope className="size-4" />
                بررسی سلامت دیتابیس
              </a>
            </Button>
          </div>

          {error?.digest ? (
            <p className="text-muted-foreground text-xs" dir="ltr">
              digest: {error.digest}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
