import { redirect } from "next/navigation";
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
import { ProductForm } from "@/components/product-form";
import { ProductsTable, type ProductRow } from "@/components/products-table";
import { auth } from "@/lib/auth";
import { listAllProducts, listCategories } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export const metadata = { title: "محصولات" };

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");
  const storeId = session.user.storeId;

  const [products, categories] = await Promise.all([
    listAllProducts(storeId),
    listCategories(storeId),
  ]);

  const rows: ProductRow[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    sku: product.sku ?? null,
    categoryName: product.category?.name ?? null,
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
    stock: Number(product.stock),
    lowStockThreshold: Number(product.lowStockThreshold),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="محصولات"
        description={`${toPersianDigits(products.length)} قلم کالا در انبار`}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="size-4" />
              لیست محصولات
            </CardTitle>
            <CardDescription>
              جست‌وجو، فیلتر کم‌موجودها و وضعیت موجودی هر کالا
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductsTable products={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>افزودن محصول</CardTitle>
            <CardDescription>
              بارکد را دقیق وارد کنید؛ اسکنر موبایل همین بارکد را می‌خواند.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
