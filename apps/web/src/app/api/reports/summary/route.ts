import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/reports/summary — financial dashboard numbers */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const storeId = user.storeId;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      todayInvoices,
      monthInvoices,
      todayExpenses,
      monthExpenses,
      inventoryValue,
      lowStockCount,
      unpaidInvoices,
      invoiceCount,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { storeId, createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { storeId, createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
        _sum: { total: true },
      }),
      prisma.expense.aggregate({
        where: { storeId, date: { gte: startOfToday } },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: { storeId, date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.product.aggregate({
        where: { storeId },
        _sum: { stock: true },
      }),
      prisma.product.count({ where: { storeId } }), // refined below
      prisma.invoice.aggregate({
        where: { storeId, status: { in: ["ISSUED", "PARTIAL"] } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.invoice.count({ where: { storeId } }),
    ]);

    // inventory value needs per-product costPrice * stock — compute in one pass
    const products = await prisma.product.findMany({
      where: { storeId },
      select: { stock: true, costPrice: true, lowStockThreshold: true },
    });
    const invValue = products.reduce(
      (sum, p) => sum + p.stock * Number(p.costPrice),
      0,
    );
    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold).length;

    const todayRevenue = Number(todayInvoices._sum.total ?? 0);
    const monthRevenue = Number(monthInvoices._sum.total ?? 0);
    const todayExpensesAmount = Number(todayExpenses._sum.amount ?? 0);
    const monthExpensesAmount = Number(monthExpenses._sum.amount ?? 0);

    return NextResponse.json({
      todayRevenue,
      monthRevenue,
      todayExpenses: todayExpensesAmount,
      monthExpenses: monthExpensesAmount,
      netProfitToday: todayRevenue - todayExpensesAmount,
      netProfitMonth: monthRevenue - monthExpensesAmount,
      inventoryValue: invValue,
      lowStockCount: lowStock,
      unpaidInvoicesAmount: Number(unpaidInvoices._sum.total ?? 0),
      invoiceCount,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
