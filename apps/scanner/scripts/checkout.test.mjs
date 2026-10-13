// تست منطق «سبد → فاکتور» — با node --test اجرا می‌شود:
//   pnpm --filter @my-store/scanner test
// (Node 22 فایل‌های TypeScript را بدون کامپایل می‌خواند.)

import assert from "node:assert/strict";
import test from "node:test";

import { buildInvoiceInput, computeTotals } from "../src/lib/checkout.ts";

const lines = [
  { productId: "p1", qty: 2, unitPrice: 50_000 },
  { productId: "p2", qty: 1, unitPrice: 120_000 },
];

test("جمع سبد با مالیات درست حساب می‌شود", () => {
  const totals = computeTotals(lines, 9);
  assert.equal(totals.count, 3);
  assert.equal(totals.subtotal, 220_000);
  assert.equal(totals.tax, 19_800);
  assert.equal(totals.total, 239_800);
});

test("بدون مالیات، مبلغ نهایی همان جمع کالاهاست", () => {
  const totals = computeTotals(lines, 0);
  assert.equal(totals.tax, 0);
  assert.equal(totals.total, 220_000);
});

test("پرداخت نقدی با مبلغ کل فاکتور ثبت می‌شود", () => {
  const totals = computeTotals(lines, 9);
  const input = buildInvoiceInput(lines, totals, "CASH");

  assert.equal(input.issueNow, true);
  assert.equal(input.discount, 0);
  assert.equal(input.tax, 19_800);
  assert.equal(input.items.length, 2);
  assert.deepEqual(input.items[0], { productId: "p1", qty: 2, unitPrice: 50_000 });
  assert.equal(input.payment?.method, "CASH");
  assert.equal(input.payment?.amount, totals.total);
});

test("نسیه: فاکتور صادر می‌شود ولی پرداختی ندارد", () => {
  const totals = computeTotals(lines, 9);
  const input = buildInvoiceInput(lines, totals, "CREDIT");
  assert.equal(input.payment, undefined);
  assert.equal(input.issueNow, true);
});

test("ردیف‌های صفر یا بدون کالا حذف می‌شوند", () => {
  const totals = computeTotals(lines, 0);
  const input = buildInvoiceInput(
    [...lines, { productId: "", qty: 1, unitPrice: 1000 }, { productId: "p3", qty: 0, unitPrice: 500 }],
    totals,
    "CARD",
  );
  assert.equal(input.items.length, 2);
});

test("سبد خالی خطا می‌دهد", () => {
  assert.throws(() => buildInvoiceInput([], { tax: 0, total: 0 }, "CASH"));
});
