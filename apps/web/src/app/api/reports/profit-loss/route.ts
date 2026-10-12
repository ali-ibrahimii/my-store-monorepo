import { NextResponse } from "next/server";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getLedgerBreakdown } from "@/lib/stats";
import { LEDGER_ACCOUNT_LABELS } from "@my-store/shared-utils";
import type { ProfitLossReport, ProfitLossRow } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

/**
 * GET /api/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD
 * سود و زیان از روی دفتر کل دوطرفه (کالکشن transactions) محاسبه می‌شود.
 */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ACCOUNTANT");
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to + "T23:59:59.999Z") : now;

    const byAccount = await getLedgerBreakdown(user.storeId, fromDate, toDate);

    const rows: ProfitLossRow[] = [...byAccount.entries()].map(([account, v]) => ({
      account: account as ProfitLossRow["account"],
      label: LEDGER_ACCOUNT_LABELS[account] ?? account,
      debit: v.debit,
      credit: v.credit,
      balance: v.debit - v.credit,
    }));

    const sum = (account: string) => byAccount.get(account) ?? { debit: 0, credit: 0 };

    const revenue = sum("SALES_REVENUE").credit - sum("SALES_REVENUE").debit;
    const cogs = sum("COGS").debit - sum("COGS").credit;
    const expensesTotal = sum("EXPENSE").debit - sum("EXPENSE").credit;
    const grossProfit = revenue - cogs;

    const report: ProfitLossReport = {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      revenue,
      cogs,
      grossProfit,
      expenses: expensesTotal,
      netProfit: grossProfit - expensesTotal,
      rows,
    };

    return NextResponse.json(report);
  } catch (error) {
    return handleRouteError(error);
  }
}
