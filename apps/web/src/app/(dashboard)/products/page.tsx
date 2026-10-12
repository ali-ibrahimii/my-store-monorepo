import { Package } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@my-store/ui-kit/components/card";
import { toPersianDigits } from "@my-store/shared-utils";

import { PageHeader } from "@/components/page-header";
import { ProductsPanel, type ProductRow } from "@/components/products-panel";
import { requirePageUser } from "@/lib/auth";
import { getStore, listAllProducts, listCategories } from "@/lib/repositories";

export const dynamic = "force-dynamic";
export const metadata = { title: "محصولات" };

export default async function ProductsPage() {
  const user = await requirePageUser();
  const [products, categories, store] = await Promise.all([
    listAllProducts(user.storeId),
    listCategories(user.storeId),
    getStore(user.storeId),
  ]);
  const canManage = user.role === "ADMIN";
  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    sku: product.sku,
    description: product.description,
    categoryId: product.categoryId,
    categoryName: product.category?.name ?? null,
    costPrice: canManage ? Number(product.costPrice) : 0,
    salePrice: Number(product.salePrice),
    stock: Number(product.stock),
    lowStockThreshold: Number(product.lowStockThreshold),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="محصولات"
        description={`${toPersianDigits(products.length)} قلم — جست‌وجو، دسته، موجودی و قیمت`}
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="size-4" />
            کاتالوگ و انبار
          </CardTitle>
          <CardDescription>
            {canManage
              ? "افزودن و تغییر قیمت در دیالوگ انجام می‌شود."
              : "صندوق‌دار فقط می‌بیند و جست‌وجو می‌کند؛ تغییر قیمت و موجودی برای مدیر است."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductsPanel
            products={rows}
            categories={categories}
            canManage={canManage}
            currency={store?.currency}
            lowStockDefault={store?.lowStockDefault}
          />
        </CardContent>
      </Card>
    </div>
  );
}
