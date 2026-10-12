import { RegisterForm } from "@/components/register-form";

export const metadata = { title: "ثبت‌نام" };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold">ثبت فروشگاه جدید</h1>
        <p className="text-muted-foreground text-sm">
          در چند ثانیه فروشگاه، انبار و حساب‌داری خود را راه بیندازید.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
