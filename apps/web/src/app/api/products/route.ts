import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { pageDTO, productDTO } from "@/lib/serialize";
import { productSchema, normalizeBarcode } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/products?search=&categoryId=&lowStock=&page=&pageSize= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const lowStock = searchParams.get("lowStock") === "1";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));

    const where = {
      storeId: user.storeId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { barcode: { contains: search, mode: "insensitive" as const } },
              { sku: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // lowStock filter needs a per-row comparison — apply post-query when requested
    const filtered = lowStock
      ? items.filter((p) => p.stock <= p.lowStockThreshold)
      : items;

    return NextResponse.json(
      pageDTO(filtered.map(productDTO), lowStock ? filtered.length : total, page, pageSize),
    );
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

    const barcode = normalizeBarcode(data.barcode);
    const exists = await prisma.product.findUnique({
      where: { storeId_barcode: { storeId: user.storeId, barcode } },
    });
    if (exists) {
      return NextResponse.json(
        { error: "محصولی با این بارکد قبلاً ثبت شده است" },
        { status: 409 },
      );
    }

    const product = await prisma.product.create({
      data: {
        storeId: user.storeId,
        name: data.name,
        barcode,
        sku: data.sku || null,
        description: data.description || null,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        stock: data.stock ?? 0,
        lowStockThreshold: data.lowStockThreshold ?? 5,
        categoryId: data.categoryId || null,
      },
      include: { category: true },
    });

    return NextResponse.json(productDTO(product), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
