import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";
import { PwaRegister } from "@/components/pwa-register";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-full">
      <DashboardNav
        userName={session.user.name ?? null}
        userEmail={session.user.email ?? ""}
        role={session.user.role}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <PwaRegister />
        {children}
      </main>
    </div>
  );
}
