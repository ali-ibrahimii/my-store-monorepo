import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { findProductByBarcode } from "@/lib/repositories";
import { redactProduct } from "@/lib/serialize";
import { normalizeForLookup } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const raw = new URL(request.url).searchParams.get("barcode") ?? "";
    const barcode = normalizeForLookup(raw);
    if (!barcode) {
      return NextResponse.json({ found: false, error: "بارکد نامعتبر است" }, { status: 400 });
    }

    const product = await findProductByBarcode(user.storeId, barcode);
    if (!product) return NextResponse.json({ found: false, barcode });
    return NextResponse.json({ found: true, product: redactProduct(product, user.role) });
  } catch (error) {
    return handleRouteError(error);
  }
}
