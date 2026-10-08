import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ProductForm } from "@/components/product-form";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@my-store/ui-kit";
import { formatCurrency, toPersianDigits } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "محصولات" };

export default async function ProductsPage() {
  const session = await auth();
  const storeId = session!.user.storeId;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { storeId },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { storeId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">محصولات</h1>
        <p className="text-muted-foreground text-sm">
          {toPersianDigits(products.length)} قلم کالا در انبار
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>لیست محصولات</CardTitle>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                هنوز محصولی ثبت نشده — از فرم کنار صفحه استفاده کنید.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-right text-muted-foreground">
                      <th className="p-2 font-medium">نام</th>
                      <th className="p-2 font-medium">بارکد</th>
                      <th className="p-2 font-medium">دسته</th>
                      <th className="p-2 font-medium">قیمت فروش</th>
                      <th className="p-2 font-medium">موجودی</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p: any) => (
                      <tr key={p.id} className="border-b last:border-0">
                        <td className="p-2 font-medium">{p.name}</td>
                        <td className="p-2" dir="ltr">{p.barcode}</td>
                        <td className="p-2 text-muted-foreground">
                          {p.category?.name ?? "—"}
                        </td>
                        <td className="p-2">{formatCurrency(Number(p.salePrice))}</td>
                        <td className="p-2">
                          <Badge
                            variant={p.stock <= p.lowStockThreshold ? "warning" : "secondary"}
                          >
                            {toPersianDigits(p.stock)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>افزودن محصول</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm categories={categories} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
