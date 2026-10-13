// تست کش نشست — با node --test اجرا می‌شود:
//   pnpm --filter web test

import assert from "node:assert/strict";
import test from "node:test";

import {
  SESSION_CACHE_TTL_MS,
  clearSessionCache,
  getCachedSession,
  getCachedTokenUser,
  hashToken,
  invalidateCachedSession,
  invalidateSessionsForUser,
  sessionKeyFromCookies,
  setCachedSession,
  setCachedTokenUser,
} from "../src/lib/session-cache.ts";

test("کلید کش از کوکی نشست ساخته می‌شود (چانک‌ها هم لحاظ می‌شوند)", () => {
  const key = sessionKeyFromCookies([
    { name: "sb-abc-auth-token.1", value: "b" },
    { name: "sb-abc-auth-token.0", value: "a" },
    { name: "theme", value: "dark" },
  ]);
  assert.equal(key, "sb-abc-auth-token.0=a|sb-abc-auth-token.1=b");
});

test("بدون کوکی نشست، کلید null است و چیزی کش نمی‌شود", () => {
  assert.equal(sessionKeyFromCookies([{ name: "theme", value: "dark" }]), null);
  setCachedSession(null, { userId: "u1", claims: {} });
  assert.equal(getCachedSession(null), null);
});

test("نشست تأییدشده تا پایان اعتبار از کش می‌آید", () => {
  clearSessionCache();
  const key = "sb-abc-auth-token=t";
  setCachedSession(key, { userId: "u1", claims: { role: "ADMIN" } });
  assert.deepEqual(getCachedSession(key), { userId: "u1", claims: { role: "ADMIN" } });
  assert.ok(SESSION_CACHE_TTL_MS > 0);
});

test("کلید نامرتبط چیزی برنمی‌گرداند", () => {
  clearSessionCache();
  setCachedSession("k1", { userId: "u1", claims: {} });
  assert.equal(getCachedSession("k2"), null);
});

test("خروج/تغییر کاربر کش آن کلید را پاک می‌کند", () => {
  clearSessionCache();
  setCachedSession("k1", { userId: "u1", claims: {} });
  invalidateCachedSession("k1");
  assert.equal(getCachedSession("k1"), null);
});

test("غیرفعال‌کردن کارمند، همه‌ی نشست‌های کش‌شده‌ی او را پاک می‌کند", () => {
  clearSessionCache();
  setCachedSession("k1", { userId: "u1", claims: {} });
  setCachedSession("k2", { userId: "u1", claims: {} });
  setCachedSession("k3", { userId: "u2", claims: {} });
  invalidateSessionsForUser("u1");
  assert.equal(getCachedSession("k1"), null);
  assert.equal(getCachedSession("k2"), null);
  assert.ok(getCachedSession("k3"));
});

test("توکن Bearer اسکنر هش می‌شود و کاربر تأییدشده کش می‌ماند", async () => {
  clearSessionCache();
  const hash = await hashToken("scanner-token-a");
  const other = await hashToken("scanner-token-b");
  assert.equal(hash, await hashToken("scanner-token-a"));
  assert.notEqual(hash, other);
  assert.ok(!hash.includes("scanner-token"));

  assert.equal(getCachedTokenUser(hash), null);
  setCachedTokenUser(hash, "u1");
  assert.equal(getCachedTokenUser(hash), "u1");
  assert.equal(getCachedTokenUser(other), null);
});

test("غیرفعال‌کردن کارمند، توکن‌های کش‌شده‌ی او را هم پاک می‌کند", async () => {
  clearSessionCache();
  const hash = await hashToken("scanner-token-c");
  setCachedTokenUser(hash, "u9");
  invalidateSessionsForUser("u9");
  assert.equal(getCachedTokenUser(hash), null);
});
