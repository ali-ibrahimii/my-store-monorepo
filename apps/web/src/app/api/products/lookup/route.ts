import { NextResponse } from "next/server";
import { collections, idOf } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { mapCategories } from "@/lib/repositories";
import { productDTO } from "@/lib/serialize";
import { normalizeForLookup } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/products/lookup?barcode=... — اسکنر از این endpoint استفاده می‌کند */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const raw = new URL(request.url).searchParams.get("barcode") ?? "";
    const barcode = normalizeForLookup(raw);
    if (!barcode) {
      return NextResponse.json({ found: false, error: "بارکد نامعتبر است" }, { status: 400 });
    }

    const { products } = await collections();
    const product = await products.findOne({ storeId: user.storeId, barcode });
    if (!product) {
      return NextResponse.json({ found: false, barcode });
    }

    const cats = await mapCategories(user.storeId, [product.categoryId]);
    return NextResponse.json({
      found: true,
      product: productDTO(product, cats.get(idOf(product.categoryId))),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
