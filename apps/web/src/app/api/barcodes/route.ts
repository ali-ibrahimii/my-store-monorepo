// ============================================================
// POST /api/barcodes — ساخت و ثبت بارکد محصولات (تب «بارکدها»)
//
// سه کار از این endpoint انجام می‌شود:
//   ۱) generate      → چند بارکد تازه بساز (فقط نمایش/چاپ، هنوز ثبت نشده)
//   ۲) fill-missing  → برای محصولات بدون بارکد، خودکار بساز و ثبت کن
//   ۳) assign        → بارکدهای ساخته‌شده (یا دستی) را روی محصولات بگذار
//
// تولید کدها EAN-13 استاندارد است (پیشوند ۶۲۸ = ایران + کد فروشگاه)، پس
// اسکنرهای واقعی آن‌ها را می‌خوانند و رقم کنترلی‌شان درست است.
// ============================================================

import { NextResponse } from "next/server";
import { z } from "zod";
import type { Role } from "@my-store/shared-types";

import { handleRouteError, jsonError, requireStoreUser } from "@/lib/api-helpers";
import {
  assignBarcodes,
  generateBarcodeBatch,
  productsWithoutBarcode,
} from "@/lib/barcode-service";
import { idOf } from "@/lib/db";

export const dynamic = "force-dynamic";

const barcodeSchema = z
  .string()
  .trim()
  .max(48, "بارکد خیلی بلند است")
  .optional()
  .or(z.literal(""));

const bodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("generate"),
    count: z.coerce.number().int().min(1, "حداقل ۱ بارکد").max(500, "حداکثر ۵۰۰ بارکد"),
    prefix: z.string().trim().max(3).optional(),
  }),
  z.object({
    action: z.literal("fill-missing"),
    productIds: z.array(z.string()).max(500).optional(),
  }),
  z.object({
    action: z.literal("assign"),
    items: z
      .array(z.object({ productId: z.string().min(1), barcode: barcodeSchema }))
      .min(1, "حداقل یک محصول انتخاب کنید")
      .max(500),
  }),
]);

export async function POST(request: Request) {
  try {
    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است");
    }
    const body = parsed.data;

    // تولید پیش‌نمایش کد: هر کاربر فروشگاه می‌تواند؛ ولی ثبت روی محصول
    // موجودی انبار را تغییر می‌دهد، پس نقش حسابدار به بالا لازم است.
    const minRole: Role = body.action === "generate" ? "CASHIER" : "ACCOUNTANT";
    const { user, response } = await requireStoreUser(minRole);
    if (!user || response) return response ?? jsonError(401, "لطفاً وارد حساب کاربری شوید");

    if (body.action === "generate") {
      const codes = await generateBarcodeBatch(user.storeId, body.count, {
        prefix: body.prefix || undefined,
      });
      return NextResponse.json({ codes });
    }

    if (body.action === "fill-missing") {
      const pending = await productsWithoutBarcode(user.storeId, body.productIds);
      if (pending.length === 0) {
        return NextResponse.json({ assigned: [], failed: [], message: "همه‌ی محصولات بارکد دارند" });
      }
      const results = await assignBarcodes(
        user.storeId,
        pending.map((doc) => ({ productId: idOf(doc._id) })),
      );
      return NextResponse.json(splitResults(results));
    }

    const results = await assignBarcodes(user.storeId, body.items);
    return NextResponse.json(splitResults(results));
  } catch (error) {
    return handleRouteError(error);
  }
}

function splitResults(results: { productId: string; barcode?: string; error?: string }[]) {
  return {
    assigned: results
      .filter((item) => item.barcode && !item.error)
      .map((item) => ({ productId: item.productId, barcode: item.barcode as string })),
    failed: results.filter((item) => item.error),
  };
}
