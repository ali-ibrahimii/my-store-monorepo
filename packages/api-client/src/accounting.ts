// ============================================================
// Accounting API — expenses, reports
// ============================================================

import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  Page,
  ProfitLossReport,
  SalesReport,
  SummaryReport,
} from "@my-store/shared-types";
import { API_ROUTES } from "@my-store/shared-utils";
import { apiGet, apiPost } from "./client";

export function listExpenses(query?: {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}): Promise<Page<Expense>> {
  return apiGet(API_ROUTES.expenses, {
    from: query?.from,
    to: query?.to,
    page: query?.page,
    pageSize: query?.pageSize,
  });
}

export function createExpense(input: CreateExpenseInput): Promise<Expense> {
  return apiPost(API_ROUTES.expenses, input);
}

export function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return apiGet(API_ROUTES.expenseCategories);
}

export function getSummary(): Promise<SummaryReport> {
  return apiGet(API_ROUTES.reportsSummary);
}

export function getProfitLoss(query: { from: string; to: string }): Promise<ProfitLossReport> {
  return apiGet(API_ROUTES.reportsProfitLoss, { from: query.from, to: query.to });
}

export function getSalesReport(query: { from: string; to: string }): Promise<SalesReport> {
  return apiGet(API_ROUTES.reportsSales, { from: query.from, to: query.to });
}
