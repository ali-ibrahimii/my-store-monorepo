import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { generateUniqueBarcode } from "@/lib/barcode-service";
import { getProduct } from "@/lib/repositories";
import { productDTO, redactProduct, type ProductRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { normalizeBarcode, productSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const SELECT = `id, name, sku, barcode, description, cost_price, sale_price, stock, low_stock_threshold,
  category_id, store_id, created_at, updated_at, categories(id, name, slug, store_id, created_at, updated_at)`;

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { id } = await context.params;
    const product = await getProduct(user.storeId, id);
    if (!product) return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    return NextResponse.json(redactProduct(product, user.role));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { id } = await context.params;

    const existing = await getProduct(user.storeId, id);
    if (!existing) return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });

    const body = await request.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.sku !== undefined) update.sku = data.sku || null;
    if (data.description !== undefined) update.description = data.description || null;
    if (data.costPrice !== undefined) update.cost_price = Number(data.costPrice);
    if (data.salePrice !== undefined) update.sale_price = Number(data.salePrice);
    if (data.stock !== undefined) update.stock = Number(data.stock);
    if (data.lowStockThreshold !== undefined) update.low_stock_threshold = Number(data.lowStockThreshold);
    if (data.categoryId !== undefined) update.category_id = data.categoryId || null;

    if (data.barcode !== undefined) {
      const barcode = normalizeBarcode(data.barcode) || (await generateUniqueBarcode(user.storeId));
      const clash = await getAdmin()
        .from("products")
        .select("id")
        .eq("store_id", user.storeId)
        .eq("barcode", barcode)
        .maybeSingle();
      if (clash.data && clash.data.id !== id) {
        return NextResponse.json({ error: "محصولی با این بارکد قبلاً ثبت شده است" }, { status: 409 });
      }
      update.barcode = barcode;
    }

    const updated = await getAdmin()
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("store_id", user.storeId)
      .select(SELECT)
      .single();
    const row = assertData(updated) as unknown as ProductRow;

    if (data.stock !== undefined && Number(data.stock) !== existing.stock) {
      await getAdmin().from("inventory_movements").insert({
        store_id: user.storeId,
        product_id: id,
        type: "ADJUSTMENT",
        qty: Number(data.stock) - existing.stock,
        ref_type: "product",
        ref_id: id,
        note: "اصلاح موجودی",
      });
    }

    return NextResponse.json(productDTO(row));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { id } = await context.params;
    const deleted = await getAdmin().from("products").delete().eq("id", id).eq("store_id", user.storeId);
    if (deleted.error) {
      return NextResponse.json(
        { error: "این محصول در فاکتور یا حرکت انبار استفاده شده و قابل حذف نیست" },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
