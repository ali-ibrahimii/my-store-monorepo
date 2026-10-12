import { cookies } from "next/headers";

import { SidebarInset, SidebarProvider } from "@my-store/ui-kit/components/sidebar";

import { AppSidebar } from "@/components/app-sidebar";
import { DbOfflineNotice } from "@/components/db-offline-notice";
import { PwaRegister } from "@/components/pwa-register";
import { SiteHeader } from "@/components/site-header";
import { requirePageUser } from "@/lib/auth";
import { getStore } from "@/lib/repositories";
import { pingDatabase } from "@/lib/supabase";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  let dbDown = false;
  let detail: string | undefined;
  let storeName = "فروشگاه من";
  try {
    const [ping, store] = await Promise.all([pingDatabase(2500), getStore(user.storeId)]);
    if (!ping.ok) {
      dbDown = true;
      detail = ping.error;
    }
    if (store?.name) storeName = store.name;
  } catch (error) {
    dbDown = true;
    detail = error instanceof Error ? error.message : String(error);
  }

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        userName={user.name}
        userEmail={user.email}
        role={user.role}
        storeName={storeName}
      />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
          {dbDown ? <DbOfflineNotice detail={detail} /> : children}
        </div>
      </SidebarInset>
      <PwaRegister />
    </SidebarProvider>
  );
}
