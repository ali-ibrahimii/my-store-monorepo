import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@my-store/ui-kit/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import { DbHealthBanner } from "@/components/db-health-banner";
import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";

/**
 * قالب داشبورد.
 *
 * نکته‌ی سرعت: این قالب قبل از رندر هر صفحه منتظر چند رفت‌وبرگشت
 * به سوپابیس می‌ماند (ping + نام فروشگاه + پروفایل). الان فقط
 * «کاربر جاری» را می‌گیرد (با کش ۲۰ ثانیه‌ای و نام فروشگاه در همان
 * کوئری) و سلامت دیتابیس را بعد از رندر، سمت کلاینت چک می‌کند.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        userName={user.name}
        userEmail={user.email}
        role={user.role}
        storeName={user.storeName ?? "فروشگاه من"}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          <DbHealthBanner />
          {children}
        </div>
      </SidebarInset>
      <PwaRegister />
    </SidebarProvider>
  );
}
