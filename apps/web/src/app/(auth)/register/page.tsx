import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "ثبت‌نام" };

export default function RegisterPage() {
  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-center text-2xl font-bold">ثبت فروشگاه جدید</h1>
        <RegisterForm />
      </div>
    </main>
  );
}
