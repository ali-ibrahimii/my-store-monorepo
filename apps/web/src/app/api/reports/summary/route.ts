import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getSummary } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const summary = await getSummary(user.storeId);
    if (user.role === "ADMIN") return NextResponse.json(summary);
    return NextResponse.json({
      ...summary,
      todayExpenses: 0,
      monthExpenses: 0,
      netProfitToday: 0,
      netProfitMonth: 0,
      inventoryValue: 0,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
