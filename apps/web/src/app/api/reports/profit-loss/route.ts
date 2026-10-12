import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { getLedgerBreakdown } from "@/lib/stats";
import { LEDGER_ACCOUNT_LABELS } from "@my-store/shared-utils";
import type { ProfitLossReport, ProfitLossRow } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = searchParams.get("from") ? new Date(searchParams.get("from")!) : defaultFrom;
    const toDate = searchParams.get("to") ? new Date(searchParams.get("to")! + "T23:59:59.999Z") : now;
    const byAccount = await getLedgerBreakdown(user.storeId, fromDate, toDate);

    const rows: ProfitLossRow[] = [...byAccount.entries()].map(([account, value]) => ({
      account: account as ProfitLossRow["account"],
      label: LEDGER_ACCOUNT_LABELS[account] ?? account,
      debit: value.debit,
      credit: value.credit,
      balance: value.debit - value.credit,
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
