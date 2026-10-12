import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections, idOf, idOrEmpty } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listProducts, mapCategories } from "@/lib/repositories";
import { productDTO } from "@/lib/serialize";
import { productSchema, normalizeBarcode } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/products?search=&categoryId=&lowStock=&page=&pageSize= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const page = await listProducts(user.storeId, {
      search: searchParams.get("search")?.trim() || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      lowStock: searchParams.get("lowStock") === "1",
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });

    return NextResponse.json(page);
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/products */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const { products } = await collections();
    const barcode = normalizeBarcode(data.barcode);

    const exists = await products.findOne({ storeId: user.storeId, barcode });
    if (exists) {
      return NextResponse.json(
        { error: "محصولی با این بارکد قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    const now = new Date();
    const _id = new ObjectId();
    const categoryId = idOrEmpty(data.categoryId) || null;

    await products.insertOne({
      _id,
      storeId: user.storeId,
      name: data.name,
      barcode,
      sku: data.sku || null,
      description: data.description || null,
      costPrice: Number(data.costPrice ?? 0),
      salePrice: Number(data.salePrice ?? 0),
      stock: Number(data.stock ?? 0),
      lowStockThreshold: Number(data.lowStockThreshold ?? 5),
      categoryId,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await products.findOne({ _id });
    const cats = await mapCategories(user.storeId, [categoryId]);
    return NextResponse.json(productDTO(doc!, cats.get(idOf(categoryId))), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
