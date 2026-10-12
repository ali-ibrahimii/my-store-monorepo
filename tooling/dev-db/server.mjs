// ============================================================
// سرور توسعه‌ی MongoDB — مخصوص محیط‌هایی که Docker ندارند
//
// حالت اصلی و پیشنهادی پروژه، docker-compose است:
//     pnpm docker:up      →  mongo:7 (replica set) روی پورت 27017
//
// این اسکریپت یک «سرور سازگار با پروتکل MongoDB» را با Node بالا
// می‌آورد تا در محیط‌های محدود (مثل پیش‌نمایش آنلاین) هم بتوان
// برنامه را اجرا کرد. داده‌ها در حافظه نگه داشته می‌شوند و با
// خاموش‌شدن پروسه از بین می‌روند.
//
// محدودیت‌ها نسبت به MongoDB واقعی:
//   - تراکنش چند داکیومنتی ندارد (برنامه خودش تشخیص می‌دهد و
//     نوشتن‌ها را به‌ترتیب انجام می‌دهد)
//   - ایندکس unique را «اجرا» نمی‌کند (فقط می‌سازد)؛ بررسی
//     تکراری‌بودن در کد برنامه هم انجام می‌شود
//
// اجرا:  pnpm db:sandbox
// ============================================================

import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const host = process.env.MONGO_HOST ?? "0.0.0.0";
const port = process.env.MONGO_PORT ?? "27017";

let binPath;
try {
  const pkg = require.resolve("@rckflr/easydb-server/package.json");
  binPath = new URL("./bin/easydb-server.js", `file://${pkg}`).pathname;
} catch {
  console.error(
    "[dev-db] پکیج @rckflr/easydb-server نصب نیست.\n" +
      "          اول `pnpm install` را در ریشه‌ی پروژه اجرا کنید.\n" +
      "          (یا به‌جای این ابزار از Docker استفاده کنید: pnpm docker:up)",
  );
  process.exit(1);
}

console.log(`[dev-db] سرور سازگار با MongoDB روی ${host}:${port} در حال شروع است…`);
console.log("[dev-db] رشته‌ی اتصال: mongodb://127.0.0.1:" + port + "/mystore?directConnection=true");
console.log("[dev-db] داده‌ها در حافظه‌اند — برای داده‌ی نمونه: pnpm db:seed");

const child = spawn(process.execPath, [binPath, "--host", host, "--port", port, "--adapter", "memory"], {
  stdio: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
    process.exit(0);
  });
}

child.on("exit", (code) => process.exit(code ?? 0));
