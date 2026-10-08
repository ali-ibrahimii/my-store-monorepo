import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { productDTO } from "@/lib/serialize";
import { productSchema, normalizeBarcode } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/products/:id */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const product = await prisma.product.findFirst({
      where: { id, storeId: user.storeId },
      include: { category: true },
    });
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    return NextResponse.json(productDTO(product));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** PATCH /api/products/:id */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;

    const existing = await prisma.product.findFirst({
      where: { id, storeId: user.storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    let barcode = existing.barcode;
    if (data.barcode) {
      barcode = normalizeBarcode(data.barcode);
      const clash = await prisma.product.findUnique({
        where: { storeId_barcode: { storeId: user.storeId, barcode } },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json(
          { error: "محصولی با این بارکد قبلاً ثبت شده است" },
          { status: 409 },
        );
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.barcode !== undefined ? { barcode } : {}),
        ...(data.sku !== undefined ? { sku: data.sku || null } : {}),
        ...(data.description !== undefined ? { description: data.description || null } : {}),
        ...(data.costPrice !== undefined ? { costPrice: data.costPrice } : {}),
        ...(data.salePrice !== undefined ? { salePrice: data.salePrice } : {}),
        ...(data.stock !== undefined ? { stock: data.stock } : {}),
        ...(data.lowStockThreshold !== undefined
          ? { lowStockThreshold: data.lowStockThreshold }
          : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId || null } : {}),
      },
      include: { category: true },
    });

    return NextResponse.json(productDTO(product));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** DELETE /api/products/:id */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ACCOUNTANT");
    if (!user) return response;
    const { id } = await context.params;

    const existing = await prisma.product.findFirst({
      where: { id, storeId: user.storeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
