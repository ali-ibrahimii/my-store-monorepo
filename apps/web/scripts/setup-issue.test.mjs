// تست‌های تشخیص «چرا سرور آماده نیست» و بارکد — با node --test اجرا می‌شود:
//   pnpm --filter web test

import assert from "node:assert/strict";
import test from "node:test";

import { classifySetupIssue, SETUP_ISSUE_LABELS } from "../../../packages/shared-utils/src/errors.ts";
import {
  generateEan13,
  GS1_INSTORE_PREFIX,
  isValidEan13,
  storeCodeFromId,
} from "../../../packages/shared-utils/src/barcode.ts";

test("متغیر محیطی ناقص ← نوع env", () => {
  assert.equal(classifySetupIssue({ configured: false, missingEnv: ["SUPABASE_SECRET_KEY"] }), "env");
});

test("جدول ساخته‌نشده ← نوع schema", () => {
  const kind = classifySetupIssue({
    ok: false,
    database: { error: 'relation "public.stores" does not exist' },
  });
  assert.equal(kind, "schema");
  assert.equal(SETUP_ISSUE_LABELS[kind], "دیتابیس آماده نشده");
});

test("خطای شبکه/پروژه Paused ← نوع unreachable (نه schema)", () => {
  assert.equal(classifySetupIssue({ ok: false, database: { error: "fetch failed" } }), "unreachable");
  assert.equal(
    classifySetupIssue({ ok: false, database: { error: "پاسخی از سوپابیس نیامد" } }),
    "unreachable",
  );
});

test("کلید نامعتبر ← نوع denied", () => {
  assert.equal(classifySetupIssue({ ok: false, database: { error: "Invalid API key" } }), "denied");
});

test("نوع اعلام‌شده توسط health اولویت دارد", () => {
  assert.equal(classifySetupIssue({ ok: false, database: { kind: "denied", error: "x" } }), "denied");
});

test("بدون پاسخ ← unreachable", () => {
  assert.equal(classifySetupIssue(null), "unreachable");
});

test("بارکد درون‌فروشگاهی (۲۰) رقم کنترلی معتبر دارد", () => {
  const code = generateEan13({
    prefix: GS1_INSTORE_PREFIX,
    storeCode: storeCodeFromId("6d0c3de2-0000-4000-8000-000000000000"),
    serial: 7,
  });
  assert.equal(code.length, 13);
  assert.ok(code.startsWith("200"));
  assert.ok(isValidEan13(code));
  assert.ok(!code.startsWith("628"), "نباید وانمود کند کد رسمی ایران است");
});
