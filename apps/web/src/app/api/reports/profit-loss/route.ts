import { NextResponse } from "next/server";

import { rangeFromParams } from "@/lib/date-range";
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
    // بازه با ساعت فروشگاه (Asia/Kabul) و اعتبارسنجی تاریخ
    const range = rangeFromParams(searchParams.get("from"), searchParams.get("to"));
    const byAccount = await getLedgerBreakdown(user.storeId, range.from, range.to);

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
      from: range.fromKey,
      to: range.toKey,
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
