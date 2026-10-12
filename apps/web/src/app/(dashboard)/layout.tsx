import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { pingDatabase } from "@/lib/db";
import { DbOfflineNotice } from "@/components/db-offline-notice";
import { DashboardNav } from "@/components/dashboard-nav";
import { PwaRegister } from "@/components/pwa-register";

/**
 * در محیط توسعه، اگر دیتابیس در دسترس نباشد اینجا (و فقط اینجا) یک پیام
 * روشن نشان می‌دهیم — وگرنه هر صفحه با خطای خام MongoDB می‌افتد و کاربر
 * فکر می‌کند «سرور کار نمی‌کند».
 * در production این بررسی انجام نمی‌شود (هزینه‌ی اضافه ندارد).
 */
async function databaseStatus(): Promise<{ down: boolean; detail?: string }> {
  if (process.env.NODE_ENV === "production") return { down: false };

  try {
    const result = await pingDatabase(2500);
    if (!result.ok) return { down: true, detail: result.error };
  } catch {
    // اگر خودِ بررسی خطا داد، صفحه را متوقف نمی‌کنیم
  }
  return { down: false };
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const db = await databaseStatus();

  return (
    <div className="flex min-h-full">
      <DashboardNav
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ""}
        role={session.user.role}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <PwaRegister />
        {db.down ? <DbOfflineNotice detail={db.detail} /> : children}
      </main>
    </div>
  );
}
