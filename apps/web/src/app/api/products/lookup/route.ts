import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { productDTO } from "@/lib/serialize";
import { normalizeForLookup } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/products/lookup?barcode=... — used by the scanner */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const raw = new URL(request.url).searchParams.get("barcode") ?? "";
    const barcode = normalizeForLookup(raw);
    if (!barcode) {
      return NextResponse.json(
        { found: false, error: "بارکد نامعتبر است" },
        { status: 400 },
      );
    }

    const product = await prisma.product.findUnique({
      where: { storeId_barcode: { storeId: user.storeId, barcode } },
      include: { category: true },
    });

    if (!product) {
      return NextResponse.json({ found: false, barcode });
    }
    return NextResponse.json({ found: true, product: productDTO(product) });
  } catch (error) {
    return handleRouteError(error);
  }
}
