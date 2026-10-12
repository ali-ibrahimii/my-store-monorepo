import { PageHeader } from "@/components/page-header";
import { PurchasesPanel } from "@/components/purchases-panel";
import { requireAdminPage } from "@/lib/auth";
import { listAllProducts, listPurchases } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "خرید کالا" };

export default async function PurchasesPage() {
  const user = await requireAdminPage();
  const [purchases, products] = await Promise.all([
    listPurchases(user.storeId),
    listAllProducts(user.storeId),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="خرید و ورود کالا"
        description="خرید موجودی را زیاد می‌کند، بهای تمام‌شده را میانگین می‌گیرد و سند انبار/بستانکاری می‌سازد"
      />
      <PurchasesPanel
        products={products.map((product) => ({
          id: product.id,
          name: product.name,
          stock: Number(product.stock),
          costPrice: Number(product.costPrice),
        }))}
        purchases={purchases.map((purchase) => ({
          id: purchase.id,
          number: purchase.number,
          supplier: purchase.supplier,
          total: Number(purchase.total),
          paidAmount: Number(purchase.paidAmount),
          createdAt: purchase.createdAt,
        }))}
      />
    </div>
  );
}
