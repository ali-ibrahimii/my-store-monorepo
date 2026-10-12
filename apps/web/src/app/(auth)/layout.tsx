import Link from "next/link";
import { ScanLine } from "lucide-react";
import { APP_NAME_FA } from "@my-store/shared-utils";

import { Card, CardContent } from "@my-store/ui-kit/components/card";

import { ThemeToggle } from "@/components/theme-toggle";

/** قالب مشترک صفحه‌های ورود و ثبت‌نام. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/40 relative flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>

      <Link href="/" className="flex items-center gap-2">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
          <ScanLine className="size-5" />
        </div>
        <span className="font-bold">{APP_NAME_FA}</span>
      </Link>

      <Card className="w-full max-w-md">
        <CardContent className="p-6">{children}</CardContent>
      </Card>

      <p className="text-muted-foreground text-center text-xs">
        مدیریت فروشگاه، انبار، حساب‌داری و اسکن لحظه‌ای محصولات
      </p>
    </div>
  );
}
