// ============================================================
// CLI seed:  pnpm db:seed
//
// داده‌ی نمونه را داخل MongoDB می‌سازد (اگر از قبل باشد، چیزی نمی‌سازد).
//
// نکته: `pnpm dev` خودش این کار را انجام می‌دهد؛ این اسکریپت برای
// ریختن دستی داده (و `pnpm db:reset` که --fresh می‌دهد) است.
// ============================================================

import { MongoClient } from "mongodb";
import { readEnvFiles, redactMongoUri, resolveDbName, resolveMongoUri } from "@my-store/dev-db";
import { fileURLToPath } from "node:url";
import { runDemoSeed } from "./demo-seed.mjs";

const webDir = fileURLToPath(new URL("..", import.meta.url));
// مثل Next، مقادیر .env.local/.env را می‌خوانیم تا با `pnpm dev` یکی باشد.
// توجه: این اسکریپت فایل .env.local نمی‌سازد (کار `pnpm dev` است)؛
// اگر نبود، مقدارهای پیش‌فرض توسعه استفاده می‌شوند.
const env = { ...readEnvFiles(webDir), ...process.env };

const uri = resolveMongoUri(env);
const dbName = resolveDbName(uri, env);

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 });

const fresh = process.argv.includes("--fresh");
// --optional: اگر دیتابیس در دسترس نبود، فقط هشدار بده و با کد 0 خارج شو
// (تا اسکریپت dev را متوقف نکند)
const optional = process.argv.includes("--optional");

try {
  await client.connect();
  const db = client.db(dbName);
  console.log(`[seed] متصل به ${redactMongoUri(uri)} → دیتابیس «${dbName}»`);

  if (fresh) {
    console.log("[seed] --fresh: dropping database first");
    await db.dropDatabase();
  }

  const result = await runDemoSeed(db, { log: (m) => console.log(`[seed] ${m}`) });

  if (result?.seeded && result.products) {
    console.log("[seed] بارکدهای نمونه:");
    for (const p of result.products) {
      console.log(`        ${p.barcode}  ${p.name}`);
    }
  }
} catch (error) {
  console.error("[seed] ناموفق:", error?.message ?? error);
  console.error(
    "[seed] آیا MongoDB در حال اجراست؟\n" +
      "        - ساده‌ترین راه:  pnpm dev   (دیتابیس را خودش بالا می‌آورد)\n" +
      "        - دستی:           pnpm db:sandbox\n" +
      "        - با Docker:      pnpm docker:up",
  );
  if (!optional) process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
