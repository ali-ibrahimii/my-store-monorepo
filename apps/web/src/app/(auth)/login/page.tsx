import { Suspense } from "react";

import { Skeleton } from "@my-store/ui-kit/components/skeleton";

import { LoginForm } from "@/components/login-form";

export const metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold">ورود به فروشگاه من</h1>
        <p className="text-muted-foreground text-sm">
          برای دیدن داشبورد، ایمیل و رمز عبور خود را وارد کنید.
        </p>
      </div>
      <Suspense fallback={<Skeleton className="h-64 w-full" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
