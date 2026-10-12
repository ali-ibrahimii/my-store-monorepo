import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@my-store/ui-kit/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import { DbOfflineNotice } from "@/components/db-offline-notice";
import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { auth } from "@/lib/auth";
import { pingDatabase } from "@/lib/db";

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

  const [db, cookieStore] = await Promise.all([databaseStatus(), cookies()]);
  // سایدبار shadcn وضعیتش را در کوکی نگه می‌دارد تا سمت سرور هم خوانده شود.
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ""}
        role={session.user.role}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {db.down ? <DbOfflineNotice detail={db.detail} /> : children}
        </div>
      </SidebarInset>
      <PwaRegister />
    </SidebarProvider>
  );
}
