import { redirect } from "next/navigation";
import { Barcode } from "lucide-react";

import { Badge } from "@my-store/ui-kit/components/badge";
import { toPersianDigits, storeCodeFromId, hasRole } from "@my-store/shared-utils";

import { BarcodeStudio, type BarcodeStudioProduct } from "@/components/barcode-studio";
import { PageHeader } from "@/components/page-header";
import { auth } from "@/lib/auth";
import { listAllProducts } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export const metadata = { title: "بارکدها" };

export default async function BarcodesPage({
  searchParams,
}: {
  searchParams: Promise<{ product?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.storeId) redirect("/login");

  const { product: focusProductId } = await searchParams;

  const storeId = session.user.storeId;
  const products = await listAllProducts(storeId);

  const rows: BarcodeStudioProduct[] = products.map((product) => ({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    sku: product.sku ?? null,
    categoryName: product.category?.name ?? null,
    salePrice: Number(product.salePrice),
    hasBarcode: product.barcode.trim().length > 0,
  }));

  const withoutBarcode = rows.filter((row) => !row.hasBarcode).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="بارکدها"
        description="برای محصولاتت بارکد استاندارد بساز، روی محصولات بگذار و برچسب چاپ کن."
      >
        <Badge variant="secondary" className="gap-1">
          <Barcode className="size-3" />
          EAN-13 — پیشوند ایران
        </Badge>
        <Badge variant={withoutBarcode > 0 ? "warning" : "success"}>
          {withoutBarcode > 0
            ? `${toPersianDigits(withoutBarcode)} محصول بدون بارکد`
            : "همه‌ی محصولات بارکد دارند"}
        </Badge>
      </PageHeader>

      {/* key: با تغییر محصولِ فوکوس (لینک «برچسب» در جدول محصولات) تب و
          انتخاب‌های اولیه از نو ساخته می‌شوند. */}
      <BarcodeStudio
        key={focusProductId ?? "all"}
        products={rows}
        storeCode={storeCodeFromId(storeId)}
        canEdit={hasRole(session.user.role, "ACCOUNTANT")}
        focusProductId={focusProductId}
      />
    </div>
  );
}
