import { NextResponse } from "next/server";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listScanEvents } from "@/lib/repositories";
import { recordScan } from "@/lib/scan-service";
import { scanInputSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/scan — آخرین رویدادهای اسکن (حالت اولیه‌ی فید زنده) */
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

/**
 * POST /api/scan — ثبت یک اسکن
 * بلافاصله ذخیره می‌شود و به‌صورت لحظه‌ای برای همه‌ی کلاینت‌ها پخش می‌شود.
 */
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

    const event = await recordScan(parsed.data, user.id, user.storeId);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
