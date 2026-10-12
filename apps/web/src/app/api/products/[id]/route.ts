import { NextResponse } from "next/server";
import { collections, idOf, idOrEmpty, oid } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { mapCategories } from "@/lib/repositories";
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

    const { products } = await collections();
    const product = await products.findOne({ _id: oid(id), storeId: user.storeId });
    if (!product) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    const cats = await mapCategories(user.storeId, [product.categoryId]);
    return NextResponse.json(productDTO(product, cats.get(idOf(product.categoryId))));
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

    const { products } = await collections();
    const productOid = oid(id);

    const existing = await products.findOne({ _id: productOid, storeId: user.storeId });
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

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) update.name = data.name;
    if (data.sku !== undefined) update.sku = data.sku || null;
    if (data.description !== undefined) update.description = data.description || null;
    if (data.costPrice !== undefined) update.costPrice = Number(data.costPrice);
    if (data.salePrice !== undefined) update.salePrice = Number(data.salePrice);
    if (data.stock !== undefined) update.stock = Number(data.stock);
    if (data.lowStockThreshold !== undefined) {
      update.lowStockThreshold = Number(data.lowStockThreshold);
    }
    if (data.categoryId !== undefined) update.categoryId = idOrEmpty(data.categoryId) || null;

    if (data.barcode !== undefined) {
      const barcode = normalizeBarcode(data.barcode);
      const clash = await products.findOne({ storeId: user.storeId, barcode });
      if (clash && idOf(clash._id) !== id) {
        return NextResponse.json(
          { error: "محصولی با این بارکد قبلاً ثبت شده است" },
          { status: 409 },
        );
      }
      update.barcode = barcode;
    }

    await products.updateOne({ _id: productOid }, { $set: update });

    const updated = await products.findOne({ _id: productOid });
    const cats = await mapCategories(user.storeId, [updated?.categoryId]);
    return NextResponse.json(productDTO(updated!, cats.get(idOf(updated?.categoryId))));
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

    const { products } = await collections();
    const deleted = await products.deleteOne({ _id: oid(id), storeId: user.storeId });
    if (!deleted.deletedCount) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
