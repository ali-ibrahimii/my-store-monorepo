import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "ورود" };

export default function LoginPage() {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">ورود به فروشگاه من</h1>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
