// ============================================================
// CLI seed:  pnpm db:seed
//
// داده‌ی نمونه را داخل MongoDB می‌سازد (اگر از قبل باشد، چیزی نمی‌سازد).
// ============================================================

import { MongoClient } from "mongodb";
import { runDemoSeed } from "./demo-seed.mjs";

const FALLBACK_URI = "mongodb://127.0.0.1:27017/mystore?directConnection=true";
const FALLBACK_DB = "mystore";

function uri() {
  return process.env.MONGODB_URI || process.env.DATABASE_URL || FALLBACK_URI;
}

function dbName() {
  if (process.env.MONGODB_DB) return process.env.MONGODB_DB;
  const withoutQuery = uri().split("?")[0];
  const schemeEnd = withoutQuery.indexOf("://");
  const slash = withoutQuery.indexOf("/", schemeEnd === -1 ? 0 : schemeEnd + 3);
  return (slash === -1 ? "" : withoutQuery.slice(slash + 1)) || FALLBACK_DB;
}

const client = new MongoClient(uri(), { serverSelectionTimeoutMS: 10_000 });

const fresh = process.argv.includes("--fresh");
// --optional: اگر دیتابیس در دسترس نبود، فقط هشدار بده و با کد 0 خارج شو
// (تا اسکریپت dev را متوقف نکند)
const optional = process.argv.includes("--optional");

try {
  await client.connect();
  const db = client.db(dbName());
  console.log(`[seed] متصل به ${uri()} → دیتابیس «${dbName()}»`);

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
      "        - با Docker:   pnpm docker:up\n" +
      "        - بدون Docker: pnpm db:sandbox",
  );
  if (!optional) process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
