import { NextResponse } from "next/server";

import { handleRouteError, jsonError, requireStoreUser } from "@/lib/api-helpers";
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

/**
 * POST /api/products — ثبت کالای جدید.
 *
 * صندوقدار هم می‌تواند کالای تازه ثبت کند (این نیاز واقعی بازار است:
 * جنس نو با بارکد کارخانه‌ای روی پیشخوان اسکن می‌شود و اگر در سیستم
 * نباشد، فروش متوقف می‌شود). ولی اختیارش محدود است:
 *   • قیمت خرید (costPrice) را صندوق‌دار نمی‌تواند بگذارد → صفر، تا مدیر بعداً
 *     از مسیر «خرید» ثبت کند (سود و بهای تمام‌شده خراب نمی‌شود)
 *   • موجودی اولیه صفر است؛ ورود جنس فقط با «خرید» یا «حرکت انبار» انجام شود
 *   • قیمت فروش اجباری و بزرگ‌تر از صفر است
 */
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
    const isAdmin = user.role === "ADMIN";
    if (!isAdmin && Number(data.salePrice ?? 0) <= 0) {
      return jsonError(400, "برای ثبت کالای جدید، قیمت فروش لازم است");
    }

    // سهمیه‌ی روزانه برای صندوق‌دار (مهاجرت 0003). اگر مهاجرت اجرا نشده باشد،
    // تابع وجود ندارد و ثبت کالا نباید بشکند — پس خطای «تابع نیست» نادیده
    // گرفته می‌شود.
    if (!isAdmin) {
      const gate = await getAdmin().rpc("assert_product_creation_allowed", {
        p_store: user.storeId,
        p_user: user.id,
      });
      if (gate.error && !/does not exist|schema cache|PGRST202/i.test(gate.error.message)) {
        return jsonError(429, gate.error.message);
      }
    }
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
        // صندوق‌دار: بهای خرید و موجودی را تعیین نمی‌کند (ضد تقلب)
        cost_price: isAdmin ? Number(data.costPrice ?? 0) : 0,
        sale_price: Number(data.salePrice ?? 0),
        stock: isAdmin ? Number(data.stock ?? 0) : 0,
        low_stock_threshold: isAdmin ? Number(data.lowStockThreshold ?? 5) : 0,
        category_id: data.categoryId || null,
        created_by: user.id,
      })
      .select(
        `id, name, sku, barcode, description, cost_price, sale_price, stock, low_stock_threshold,
         category_id, store_id, created_at, updated_at, categories(id, name, slug, store_id, created_at, updated_at)`,
      )
      .single();
    const row = assertData(inserted) as unknown as ProductRow;
    if (isAdmin && Number(data.stock ?? 0) > 0) {
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
