"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Copy,
  ExternalLink,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import { Button } from "@my-store/ui-kit/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { Separator } from "@my-store/ui-kit/components/separator";
import { Skeleton } from "@my-store/ui-kit/components/skeleton";

interface EnvRow {
  key: string;
  label: string;
  present: boolean;
  preview: string;
  required: boolean;
  legacyKey: string | null;
}

interface Step {
  id: string;
  title: string;
  ok: boolean;
  detail: string;
  fix: string;
}

interface SetupResponse {
  ok: boolean;
  env: EnvRow[];
  steps: Step[];
  realtimeReady: boolean;
  runtime: { node: string; vercel: boolean; vercelEnv: string | null; region: string | null };
  time: string;
}

const REPO = "https://github.com/ali-ibrahimii/my-store-monorepo";

const ENV_TEMPLATE = `NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=sb_secret_...
NEXT_PUBLIC_APP_URL=https://<your-web-domain>
CORS_ORIGINS=https://<your-scanner-domain>`;

export function SetupStatusPanel() {
  const [data, setData] = React.useState<SetupResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/setup/status", { cache: "no-store" });
      const body = (await response.json()) as SetupResponse;
      setData(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "خواندن وضعیت ناموفق بود");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [load]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // مرورگر اجازه نداد
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              وضعیت کلی
              {data ? (
                data.ok ? (
                  <Badge className="gap-1">
                    <CheckCircle2 className="size-3" /> آماده‌ی کار
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" /> نیاز به تنظیم
                  </Badge>
                )
              ) : null}
            </CardTitle>
            <CardDescription>
              {data?.runtime.vercel
                ? `روی ورسل (${data.runtime.vercelEnv ?? "production"})`
                : "اجرای محلی"}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className="size-3.5" />
            بررسی دوباره
          </Button>
        </CardHeader>
      </Card>

      {loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : null}

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="text-destructive p-4 text-sm">{error}</CardContent>
        </Card>
      ) : null}

      {data?.steps.map((step) => (
        <Card key={step.id} className={step.ok ? "" : "border-warning/50"}>
          <CardContent className="flex gap-3 p-4">
            {step.ok ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="text-destructive mt-0.5 size-5 shrink-0" />
            )}
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold">{step.title}</p>
              <p className="text-muted-foreground text-xs leading-6">{step.detail}</p>
              {!step.ok ? (
                <p className="bg-muted rounded-md p-2 text-xs leading-6">راه‌حل: {step.fix}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}

      {data ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">متغیرهای محیطی</CardTitle>
            <CardDescription>
              در ورسل باید برای محیط <strong>Production</strong> هم تعریف شده باشند و
              بعد از تغییر، Redeploy لازم است.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-xs">
              {data.env.map((row) => (
                <li key={row.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    {row.present ? (
                      <CheckCircle2 className="size-3.5 text-emerald-500" />
                    ) : row.required ? (
                      <XCircle className="text-destructive size-3.5" />
                    ) : (
                      <CircleDashed className="text-muted-foreground size-3.5" />
                    )}
                    <code dir="ltr" className="font-mono">
                      {row.key}
                    </code>
                  </span>
                  <span className="text-muted-foreground max-w-[45%] truncate" dir="ltr">
                    {row.present ? row.preview : "—"}
                  </span>
                </li>
              ))}
            </ul>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">نمونه‌ی آماده برای کپی در ورسل</span>
                <Button variant="ghost" size="sm" onClick={() => void copy(ENV_TEMPLATE)}>
                  <Copy className="size-3.5" />
                  کپی
                </Button>
              </div>
              <pre
                dir="ltr"
                className="bg-muted overflow-auto rounded-md p-3 text-[11px] leading-5"
              >
                {ENV_TEMPLATE}
              </pre>
              <p className="text-muted-foreground text-[11px] leading-5">
                کلیدها را از سوپابیس بگیرید: Project Settings → API Keys. کلید secret
                فقط برای سرور است و باید در ورسل (بدون NEXT_PUBLIC_) تعریف شود.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-base">چیزهایی که فقط خودتان می‌توانید تنظیم کنید</CardTitle>
          <CardDescription>
            این سه مورد از داخل برنامه قابل بررسی نیست، ولی بیشترِ «کار نمی‌کند»ها
            از همین‌هاست.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs leading-6">
          <div className="flex gap-2">
            <span className="text-primary font-semibold">۱)</span>
            <p>
              <strong>اپ اسکنر روی ورسل:</strong> متغیر{" "}
              <code dir="ltr" className="bg-muted rounded px-1 font-mono">
                VITE_API_URL
              </code>{" "}
              را دقیقاً روی آدرس همین وب‌اپ (با https، بدون اسلش انتهایی) بگذارید و
              بعد Redeploy کنید؛ متغیرهای Vite در زمان بیلد خوانده می‌شوند. Root
              Directory پروژه‌ی اسکنر هم باید{" "}
              <code dir="ltr" className="bg-muted rounded px-1 font-mono">
                apps/scanner
              </code>{" "}
              باشد.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-semibold">۲)</span>
            <p>
              <strong>Deployment Protection:</strong> اگر لینک ورسل روی گوشی صفحه‌ی
              «Log in to Vercel» نشان می‌دهد، در Vercel → Settings → Deployment
              Protection آن را خاموش کنید (یا برای Production) و از دامنه‌ی اصلی
              استفاده کنید.
            </p>
          </div>
          <div className="flex gap-2">
            <span className="text-primary font-semibold">۳)</span>
            <p>
              <strong>سرعت:</strong> در Vercel → Settings → Functions، ناحیه‌ی اجرا
              (Region) را نزدیک ناحیه‌ی پروژه‌ی سوپابیس بگذارید؛ هر صفحه چند کوئری
              به سوپابیس می‌زند و فاصله‌ی جغرافیایی مستقیم روی سرعت اثر دارد.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">فایل‌های SQL و مستندات</CardTitle>
          <CardDescription>
            هر فایل را کامل کپی کنید و در سوپابیس → SQL Editor اجرا کنید.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <a
            href={`${REPO}/blob/main/supabase/migrations/0001_init.sql`}
            target="_blank"
            rel="noreferrer"
            className="text-primary flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            0001_init.sql — ساخت جدول‌ها، تابع‌ها و دسترسی‌ها
          </a>
          <a
            href={`${REPO}/blob/main/supabase/migrations/0002_realtime.sql`}
            target="_blank"
            rel="noreferrer"
            className="text-primary flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            0002_realtime.sql — ریل‌تایم اسکنر و وب
          </a>
          <a
            href={`${REPO}/blob/main/DEPLOYMENT.md`}
            target="_blank"
            rel="noreferrer"
            className="text-primary flex items-center gap-1.5 underline-offset-4 hover:underline"
          >
            <ExternalLink className="size-3.5" />
            DEPLOYMENT.md — چک‌لیست کامل ورسل (وب + اسکنر)
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
