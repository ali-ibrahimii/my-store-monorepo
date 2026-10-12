import { PageHeader } from "@/components/page-header";
import { StaffPanel } from "@/components/staff-panel";
import { requireAdminPage } from "@/lib/auth";
import { listStaff } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "کاربران" };

export default async function StaffPage() {
  const user = await requireAdminPage();
  const staff = await listStaff(user.storeId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="کاربران فروشگاه"
        description="مدیر همه چیز را می‌بیند؛ صندوق‌دار فقط فروش، اسکن و مشتری"
      />
      <StaffPanel
        currentUserId={user.id}
        members={staff.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          active: member.active,
          createdAt: member.created_at,
        }))}
      />
    </div>
  );
}
