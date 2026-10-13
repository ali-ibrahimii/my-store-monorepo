import { NextResponse } from "next/server";

import { handleRouteError, jsonError, requireStoreUser } from "@/lib/api-helpers";
import { listScanEvents } from "@/lib/repositories";
import { recordScan } from "@/lib/scan-service";
import { scanInputSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** صندوق‌دار: فروش، شمارش و اسکن داخل سبد فاکتور (CART) */
const CASHIER_TYPES = new Set(["SALE", "COUNT", "CART"]);

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const { searchParams } = new URL(request.url);
    const page = await listScanEvents(user.storeId, {
      page: Number(searchParams.get("page")) || 1,
      pageSize: Number(searchParams.get("pageSize")) || 30,
    });
    return NextResponse.json(page);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = scanInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const type = parsed.data.type ?? "CHECK_IN";
    if (user.role !== "ADMIN" && !CASHIER_TYPES.has(type)) {
      return jsonError(403, "صندوق‌دار فقط می‌تواند فروش یا شمارش ثبت کند");
    }

    const event = await recordScan(parsed.data, user.id, user.storeId);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
