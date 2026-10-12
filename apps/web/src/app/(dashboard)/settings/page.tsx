import { SettingsForm } from "@/components/settings-form";
import { PageHeader } from "@/components/page-header";
import { requireAdminPage } from "@/lib/auth";
import { getStore } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "تنظیمات فروشگاه" };

export default async function SettingsPage() {
  const user = await requireAdminPage();
  const store = await getStore(user.storeId);
  if (!store) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات فروشگاه"
        description="نام، مالیات، پیشوند فاکتور و متن رسید — فقط مدیر"
      />
      <SettingsForm store={store} />
    </div>
  );
}
