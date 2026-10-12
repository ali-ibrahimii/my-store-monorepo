// ============================================================
// `pnpm dev` — اجرای کل محیط توسعه با یک دستور
//
// قبلاً برای اجرا دو ترمینال لازم بود (`pnpm db:sandbox` و `pnpm dev`)
// و اگر کسی دیتابیس را بالا نمی‌آورد، وب‌اپ بالا می‌آمد ولی ورود
// کار نمی‌کرد (پیام گمراه‌کننده‌ی «رمز اشتباه است»).
//
// این اسکریپت به‌ترتیب:
//   ۱) اگر .env.local نبود، می‌سازد و AUTH_SECRET تصادفی می‌گذارد
//      (بدون آن، Proxy نمی‌تواند نشست را بخواند و ورود «برمی‌گردد»)
//   ۲) اگر MongoDB در دسترس نبود و آدرس لوکال بود، دیتابیس توسعه‌ی
//      داخل ریپو را بالا می‌آورد و بعد از اجرا خودش خاموشش می‌کند
//   ۳) داده‌ی نمونه را می‌ریزد (اگر دیتابیس خالی باشد)
//   ۴) `next dev` را روی 0.0.0.0 اجرا می‌کند (تا پیش‌نمایش/موبایل هم
//      بتواند وصل شود) و سیگنال‌های توقف را درست پاس می‌دهد
//
// گزینه‌ها (env):  PORT/DEV_PORT  HOST  AUTO_SEED=0  MONGO_HOST
//
// `node scripts/dev.mjs --ensure-only` فقط env/دیتابیس/seed را آماده
// می‌کند و Next را اجرا نمی‌کند (برای عیب‌یابی: pnpm db:ensure).
// ============================================================

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MongoClient } from "mongodb";
import {
  connectOrStartDatabase,
  ensureEnvFile,
  readEnvFiles,
  redactMongoUri,
  resolveDbName,
  resolveMongoUri,
} from "@my-store/dev-db";

import { DEMO_CREDENTIALS, runDemoSeed } from "./demo-seed.mjs";

const require = createRequire(import.meta.url);
const webDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = require.resolve("next/dist/bin/next");

// فقط env/دیتابیس/seed را آماده کن و Next را اجرا نکن (برای عیب‌یابی)
const ensureOnly = process.argv.includes("--ensure-only");

const log = (message) => console.log(`[dev] ${message}`);

// ------------------------------------------------------------
// ۱) env
// ------------------------------------------------------------
const envFile = ensureEnvFile(webDir, { log });
const fileEnv = readEnvFiles(webDir);
// اولویت: متغیرهای واقعی محیط > .env.local > .env  (مثل خودِ Next)
const env = { ...fileEnv, ...process.env };

// ------------------------------------------------------------
// ۲) اگر یک سرور dev دیگر همین پوشه را گرفته، پیام روشن بده
//    (Next.js 16 قفل .next/dev/lock دارد و بدون توضیح خارج می‌شود)
//    در حالت --ensure-only این بررسی لازم نیست: ممکن است عمداً
//    بخواهیم کنار سرور در حال اجرا وضعیت دیتابیس را چک کنیم.
// ------------------------------------------------------------
function anotherDevServerIsRunning() {
  const lockPath = path.join(webDir, ".next", "dev", "lock");
  try {
    const info = JSON.parse(fs.readFileSync(lockPath, "utf-8"));
    if (!info?.pid) return null;
    process.kill(info.pid, 0); // خطا نمی‌دهد یعنی پروسه زنده است
    return info;
  } catch {
    return null;
  }
}

if (!ensureOnly) {
  const running = anotherDevServerIsRunning();
  if (running) {
    console.error(
      `[dev] یک سرور توسعه‌ی دیگر برای همین پوشه در حال اجراست (PID ${running.pid}).\n` +
        `      آدرس: ${running.appUrl ?? `http://localhost:${running.port ?? 3000}`}\n` +
        `      اگر می‌خواهی همین را جایگزین کنی:  kill ${running.pid}\n` +
        `      (یا از قبل همان آدرس را در مرورگر باز کن)`,
    );
    process.exit(1);
  }
}

// ------------------------------------------------------------
// ۳) دیتابیس
// ------------------------------------------------------------
const uri = resolveMongoUri(env);
const dbName = resolveDbName(uri, env);
log(`دیتابیس هدف: ${redactMongoUri(uri)} → «${dbName}»`);

const database = await connectOrStartDatabase({ uri, log });
const ownDbProcess = database.started ? database.child : null;

let exitCode = 0;

async function seedDatabase() {
  if (!database.reachable) return;
  if (String(env.AUTO_SEED ?? "1") === "0") {
    log("AUTO_SEED=0 → داده‌ی نمونه ساخته نشد.");
    return;
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const result = await runDemoSeed(client.db(dbName), { log: (m) => log(m) });
    if (result?.seeded) {
      log(`داده‌ی نمونه آماده شد — ورود: ${DEMO_CREDENTIALS.owner.email} / ${DEMO_CREDENTIALS.owner.password}`);
    }
  } catch (error) {
    console.error(
      `[dev] seed ناموفق بود: ${error?.message ?? error}\n` +
        `      اگر پورت ${database.target.port} باز است ولی MongoDB نیست، ` +
        `آن پروسه را ببندید (یا MONGO_PORT/MONGODB_URI را عوض کنید).`,
    );
  } finally {
    await client.close().catch(() => {});
  }
}

await seedDatabase();

// ------------------------------------------------------------
// ۴) next dev
// ------------------------------------------------------------
if (ensureOnly) {
  log("حالت --ensure-only: env، دیتابیس و seed آماده‌اند؛ Next اجرا نشد.");
  if (ownDbProcess) ownDbProcess.kill("SIGTERM");
  process.exit(database.reachable ? 0 : 1);
}

const host = env.HOST ?? env.DEV_HOST ?? "0.0.0.0";
const port = env.DEV_PORT ?? env.PORT ?? "";
const nextArgs = ["dev", "--hostname", host];
if (port) nextArgs.push("--port", String(port));
// اگر پورت را ما تعیین نکرده باشیم، خودِ Next پورت آزاد بعدی را می‌گیرد.

log(`اجرای Next.js روی http://${host}${port ? `:${port}` : ":3000"}`);
if (envFile.created) log(`tip: فایل .env.local ساخته شد؛ مقدارها را می‌توانی داخلش عوض کنی.`);

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  cwd: webDir,
  stdio: "inherit",
  env: process.env,
});

let shuttingDown = false;
function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  if (!child.killed) child.kill(signal);
  if (ownDbProcess && !ownDbProcess.killed) ownDbProcess.kill(signal);
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => shutdown(signal));
}

child.on("exit", (code, signal) => {
  exitCode = code ?? (signal ? 0 : 1);
  shutdown();
  process.exit(exitCode);
});

child.on("error", (error) => {
  console.error(`[dev] اجرای next dev ناموفق بود: ${error.message}`);
  shutdown();
  process.exit(1);
});

// اگر دیتابیس را ما بالا آورده بودیم، با خاموش‌شدن همه چیز پاک می‌شود.
process.on("exit", () => {
  if (ownDbProcess && !ownDbProcess.killed) ownDbProcess.kill("SIGTERM");
});
