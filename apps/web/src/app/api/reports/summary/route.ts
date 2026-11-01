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
    // صندوق‌دار: فقط اعداد فروش؛ سود، هزینه، بهای خرید و ارزش انبار پنهان می‌ماند
    return NextResponse.json({
      ...summary,
      todayExpenses: 0,
      monthExpenses: 0,
      todayCogs: 0,
      monthCogs: 0,
      grossProfitToday: 0,
      netProfitToday: 0,
      netProfitMonth: 0,
      inventoryValue: 0,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
