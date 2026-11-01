import { NextResponse } from "next/server";
import { rangeFromParams } from "@/lib/date-range";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getDailySales } from "@/lib/stats";
import type { SalesReport } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

/** GET /api/reports/sales?from=&to= — سری زمانی فروش روزانه */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const range = rangeFromParams(searchParams.get("from"), searchParams.get("to"));
    const points = await getDailySales(user.storeId, range.from, range.to);

    const report: SalesReport = {
      points,
      totalRevenue: points.reduce((sum, p) => sum + p.revenue, 0),
      totalInvoices: points.reduce((sum, p) => sum + p.invoiceCount, 0),
    };

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
