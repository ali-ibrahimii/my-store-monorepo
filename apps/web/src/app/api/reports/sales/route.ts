import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import type { DailySalesPoint, SalesReport } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

/** GET /api/reports/sales?from=&to= — daily revenue series */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom;
    const toDate = searchParams.get("to")
      ? new Date(searchParams.get("to")! + "T23:59:59.999Z")
      : now;

    const invoices = await prisma.invoice.findMany({
      where: {
        storeId: user.storeId,
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: "CANCELLED" },
      },
      select: { createdAt: true, total: true },
    });

    const byDay = new Map<string, DailySalesPoint>();
    for (const invoice of invoices) {
      const day = invoice.createdAt.toISOString().slice(0, 10);
      const point = byDay.get(day) ?? { date: day, revenue: 0, invoiceCount: 0 };
      point.revenue += Number(invoice.total);
      point.invoiceCount += 1;
      byDay.set(day, point);
    }

    const points = [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));

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
