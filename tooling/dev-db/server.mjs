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
// اجرا:   pnpm db:sandbox
// پورت:   MONGO_PORT (پیش‌فرض 27017)
// آدرس:   MONGO_HOST (پیش‌فرض 127.0.0.1 — برای دسترسی از بیرون:
//                     `MONGO_HOST=0.0.0.0 pnpm db:sandbox`)
//
// نکته: `pnpm dev` خودش اگر دیتابیس بالا نباشد این سرور را
// به‌صورت خودکار (به‌عنوان پروسه‌ی فرزند) اجرا می‌کند.
// ============================================================

import { DEFAULT_PORT, resolveSandboxBinary, spawnSandboxServer } from "./ensure.mjs";

const host = process.env.MONGO_HOST ?? "127.0.0.1";
const port = process.env.MONGO_PORT ?? String(DEFAULT_PORT);

try {
  resolveSandboxBinary();
} catch {
  console.error(
    "[dev-db] پکیج @rckflr/easydb-server نصب نیست.\n" +
      "          اول `pnpm install` را در ریشه‌ی پروژه اجرا کنید.\n" +
      "          (یا به‌جای این ابزار از Docker استفاده کنید: pnpm docker:up)",
  );
  process.exit(1);
}

console.log(`[dev-db] سرور سازگار با MongoDB روی ${host}:${port} در حال شروع است…`);
console.log(`[dev-db] رشته‌ی اتصال: mongodb://127.0.0.1:${port}/mystore?directConnection=true`);
console.log("[dev-db] داده‌ها در حافظه‌اند — برای داده‌ی نمونه: pnpm db:seed");

const child = spawnSandboxServer({ host, port });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
    process.exit(0);
  });
}

child.on("exit", (code) => process.exit(code ?? 0));
