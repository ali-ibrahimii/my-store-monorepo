import { NextResponse } from "next/server";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getSummary } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** GET /api/reports/summary — عدد و رقم‌های داشبورد مالی */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    return NextResponse.json(await getSummary(user.storeId));
  } catch (error) {
    return handleRouteError(error);
  }
}
