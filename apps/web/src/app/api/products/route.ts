import { NextResponse } from "next/server";

import { forbidCashier, handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { generateUniqueBarcode } from "@/lib/barcode-service";
import { listProducts } from "@/lib/repositories";
import { productDTO, redactProduct, type ProductRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { normalizeBarcode, productSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const page = await listProducts(user.storeId, {
      search: searchParams.get("search")?.trim() || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      lowStock: searchParams.get("lowStock") === "1",
      outOfStock: searchParams.get("outOfStock") === "1",
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 20,
    });
    return NextResponse.json({
      ...page,
      items: page.items.map((item) => redactProduct(item, user.role)),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const denied = forbidCashier(user);
    if (denied) return denied;

    const body = await request.json();
    const parsed = productSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const data = parsed.data;
    const provided = normalizeBarcode(data.barcode ?? "");
    const barcode = provided || (await generateUniqueBarcode(user.storeId));

    const clash = await getAdmin()
      .from("products")
      .select("id")
      .eq("store_id", user.storeId)
      .eq("barcode", barcode)
      .maybeSingle();
    if (clash.data) {
      return NextResponse.json({ error: "محصولی با این بارکد قبلاً ثبت شده است" }, { status: 409 });
    }

    const inserted = await getAdmin()
      .from("products")
      .insert({
        store_id: user.storeId,
        name: data.name,
        barcode,
        sku: data.sku || null,
        description: data.description || null,
        cost_price: Number(data.costPrice ?? 0),
        sale_price: Number(data.salePrice ?? 0),
        stock: Number(data.stock ?? 0),
        low_stock_threshold: Number(data.lowStockThreshold ?? 5),
        category_id: data.categoryId || null,
      })
      .select(
        `id, name, sku, barcode, description, cost_price, sale_price, stock, low_stock_threshold,
         category_id, store_id, created_at, updated_at, categories(id, name, slug, store_id, created_at, updated_at)`,
      )
      .single();
    const row = assertData(inserted) as unknown as ProductRow;
    if (Number(data.stock ?? 0) > 0) {
      await getAdmin().from("inventory_movements").insert({
        store_id: user.storeId,
        product_id: row.id,
        type: "ADJUSTMENT",
        qty: Number(data.stock),
        ref_type: "product",
        ref_id: row.id,
        note: "موجودی اولیه",
      });
    }
    return NextResponse.json(productDTO(row), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
