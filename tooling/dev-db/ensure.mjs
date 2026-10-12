// ============================================================
// ابزارهای «آماده‌سازی محیط توسعه» — مخصوص `pnpm dev`
//
// چرا این فایل وجود دارد؟
//   قبلاً برای اجرای پروژه دو ترمینال لازم بود (`pnpm db:sandbox` و
//   `pnpm dev`). اگر کسی دیتابیس را بالا نمی‌آورد، وب‌اپ بالا می‌آمد
//   ولی «ورود» کار نمی‌کرد و پیام گمراه‌کننده‌ی «ایمیل یا رمز عبور
//   اشتباه است» نمایش داده می‌شد.
//
// این ماژول:
//   ۱) فایل‌های .env.local/.env را می‌خواند (خودِ Next هنوز اجرا نشده)
//   ۲) بررسی می‌کند MongoDB در دسترس است یا نه (فقط با TCP — بدون
//      نیاز به درایور mongodb، تا از هر اسکریپت Node قابل import باشد)
//   ۳) اگر آدرس «لوکال» بود و چیزی روی آن پورت نبود، سرور
//      MongoDB-سازگارِ داخل ریپو را بالا می‌آورد (tooling/dev-db)
//
// مصرف‌کننده‌ها: apps/web/scripts/dev.mjs و scripts/seed.mjs
// ============================================================

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";

const require = createRequire(import.meta.url);

export const DEFAULT_URI = "mongodb://127.0.0.1:27017/mystore?directConnection=true";
export const DEFAULT_DB = "mystore";
export const DEFAULT_PORT = 27017;
/** فقط برای محیط توسعه — در production باید AUTH_SECRET تنظیم شود. */
export const DEV_FALLBACK_SECRET = "my-store-dev-secret-change-me-in-production";

// ------------------------------------------------------------
// env files
// ------------------------------------------------------------

/** خواندن ساده‌ی یک فایل env (بدون وابستگی به dotenv) */
export function parseEnvFile(content) {
  const out = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

/**
 * خواندن چند فایل env (اولی برنده است) — فایل‌های ناموجود نادیده گرفته می‌شوند.
 * ترتیب مثل Next.js: `.env.local` بر `.env` اولویت دارد.
 */
export function readEnvFiles(dir, names = [".env.local", ".env"]) {
  const result = {};
  for (const name of names) {
    const file = path.join(dir, name);
    try {
      const parsed = parseEnvFile(fs.readFileSync(file, "utf-8"));
      for (const [key, value] of Object.entries(parsed)) {
        if (!(key in result)) result[key] = value;
      }
    } catch {
      // فایل نیست — طبیعی است
    }
  }
  return result;
}

function randomSecret() {
  return crypto.randomBytes(32).toString("base64");
}

/**
 * اگر `.env.local` نبود، از روی `.env.example` می‌سازد و برای
 * AUTH_SECRET/NEXTAUTH_SECRET یک مقدار تصادفی می‌گذارد.
 *
 * چرا مهم است؟ بدون AUTH_SECRET، NextAuth در «Proxy» (لبه) نمی‌تواند
 * JWT نشست را بخواند و هر صفحه‌ی محافظت‌شده به /login برمی‌گردد —
 * یعنی کاربر فکر می‌کند «ورود کار نمی‌کند».
 */
export function ensureEnvFile(webDir, { log = () => {} } = {}) {
  const envPath = path.join(webDir, ".env.local");
  if (fs.existsSync(envPath)) return { path: envPath, created: false };

  const examplePath = path.join(webDir, ".env.example");
  let content;
  try {
    content = fs.readFileSync(examplePath, "utf-8");
  } catch {
    content = "";
  }
  if (!content.trim()) {
    content = [
      "# ساخته‌شده به‌صورت خودکار توسط `pnpm dev`",
      'MONGODB_URI="mongodb://127.0.0.1:27017/mystore?directConnection=true"',
      'AUTH_SECRET="__SECRET__"',
      'NEXTAUTH_SECRET="__SECRET__"',
      "",
    ].join("\n");
  }

  const secret = randomSecret();
  let replaced = false;
  content = content.replace(
    /^(AUTH_SECRET|NEXTAUTH_SECRET)=.*$/gm,
    (_line, key) => {
      replaced = true;
      return `${key}="${secret}"`;
    },
  );
  if (!replaced) {
    content += `\nAUTH_SECRET="${secret}"\nNEXTAUTH_SECRET="${secret}"\n`;
  }
  // مقدارهای placeholder باقی‌مانده را هم عوض کن
  const finalContent = content.replace(/(="change-me")/g, `="${secret}"`);

  try {
    fs.writeFileSync(envPath, finalContent, { mode: 0o600 });
    log(`فایل ${path.relative(process.cwd(), envPath)} ساخته شد (با AUTH_SECRET تصادفی).`);
    return { path: envPath, created: true };
  } catch (error) {
    log(`ساختن .env.local ناموفق بود: ${error?.message ?? error}`);
    return { path: envPath, created: false };
  }
}

// ------------------------------------------------------------
// MongoDB target / URI helpers
// ------------------------------------------------------------

/**
 * آیا رشته‌ی اتصال، یک آدرس MongoDB معتبر است؟
 * (پروژه‌های قدیمی Prisma/Postgres رشته‌های postgresql:// دارند که برای
 *  درایور mongodb غیرقابل‌پردازش‌اند و کل `pnpm dev` را می‌کُشند.)
 */
export function isMongoUri(uri) {
  return typeof uri === "string" && /^mongodb(\+srv)?:\/\//i.test(uri.trim());
}

/**
 * آدرس MongoDB را از env پیدا می‌کند؛ اگر مقدار تنظیم‌شده MongoDB نباشد
 * (مثلاً DATABASE_URL یا MONGODB_URI قدیمی با طرح postgresql://)،
 * به‌جای کرش با «MongoParseError: Invalid scheme»، هشدار روشن می‌دهد
 * و به آدرس پیش‌فرض برمی‌گردد.
 */
export function resolveMongoUri(env = process.env, { log = () => {} } = {}) {
  const candidates = [
    ["MONGODB_URI", env.MONGODB_URI],
    ["DATABASE_URL", env.DATABASE_URL],
  ];
  for (const [name, value] of candidates) {
    if (!value) continue;
    if (isMongoUri(value)) return value.trim();
    log(
      `⚠ ${name} یک آدرس MongoDB نیست و نادیده گرفته شد: ${redactMongoUri(value.trim())}\n` +
        `        این پروژه از MongoDB استفاده می‌کند؛ آدرس باید با mongodb:// یا mongodb+srv:// شروع شود.\n` +
        `        (رشته‌های postgresql:// باقی‌مانده از نسخه‌ی قدیمی Prisma/Postgres پروژه‌اند.)\n` +
        `        برای اصلاح: مقدار ${name} را در apps/web/.env.local پاک یا درست کنید،\n` +
        `        یا متغیر محیطی آن را حذف کنید (PowerShell: Remove-Item Env:${name}).\n` +
        `        فعلاً از آدرس پیش‌فرض استفاده می‌شود: ${DEFAULT_URI}`,
    );
  }
  return DEFAULT_URI;
}

/** نام دیتابیس از URI (یا از MONGODB_DB) */
export function resolveDbName(uri = resolveMongoUri(), env = process.env) {
  if (env.MONGODB_DB) return env.MONGODB_DB;
  const withoutQuery = uri.split("?")[0];
  const schemeEnd = withoutQuery.indexOf("://");
  const slash = withoutQuery.indexOf("/", schemeEnd === -1 ? 0 : schemeEnd + 3);
  const fromUri = slash === -1 ? "" : withoutQuery.slice(slash + 1);
  return fromUri || DEFAULT_DB;
}

/** پوشاندن یوزر/پسورد در لاگ‌ها */
export function redactMongoUri(uri) {
  try {
    const withScheme = uri;
    const schemeEnd = withScheme.indexOf("://");
    if (schemeEnd === -1) return uri;
    const scheme = withScheme.slice(0, schemeEnd + 3);
    const rest = withScheme.slice(schemeEnd + 3);
    const at = rest.lastIndexOf("@");
    if (at === -1) return uri;
    return `${scheme}<credentials>@${rest.slice(at + 1)}`;
  } catch {
    return "<uri>";
  }
}

/**
 * host/port را از URI بیرون می‌کشد.
 * @returns {{ host: string, port: number, isSrv: boolean, isLocal: boolean }}
 */
export function parseMongoTarget(uri = resolveMongoUri()) {
  const isSrv = uri.startsWith("mongodb+srv://");
  let host = "127.0.0.1";
  let port = DEFAULT_PORT;

  if (!isSrv) {
    const schemeEnd = uri.indexOf("://");
    if (schemeEnd !== -1) {
      let rest = uri.slice(schemeEnd + 3);
      const slash = rest.indexOf("/");
      if (slash !== -1) rest = rest.slice(0, slash);
      const at = rest.lastIndexOf("@");
      if (at !== -1) rest = rest.slice(at + 1);
      const first = rest.split(",")[0]?.trim() ?? "";
      if (first) {
        const match = first.match(/^\[(.+)\]:(\d+)$/) ?? first.match(/^(.+):(\d+)$/);
        if (match) {
          host = match[1];
          port = Number(match[2]);
        } else if (first) {
          host = first;
        }
      }
    }
  }

  const localHosts = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "::"]);
  return { host, port, isSrv, isLocal: !isSrv && localHosts.has(host.toLowerCase()) };
}

// ------------------------------------------------------------
// TCP readiness
// ------------------------------------------------------------

export function isPortOpen(host, port, timeoutMs = 700) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

export async function waitForPort(host, port, { timeoutMs = 15_000, intervalMs = 150 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await isPortOpen(host, port)) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

// ------------------------------------------------------------
// dev database (in-repo, in-memory)
// ------------------------------------------------------------

/** مسیر باینری @rckflr/easydb-server — اگر نصب نباشد خطا می‌دهد. */
export function resolveSandboxBinary() {
  const pkg = require.resolve("@rckflr/easydb-server/package.json");
  return path.join(path.dirname(pkg), "bin", "easydb-server.js");
}

/**
 * بالا آوردن سرور MongoDB-سازگار داخل ریپو (حافظه‌ای، فقط توسعه).
 * @returns {import("node:child_process").ChildProcess}
 */
export function spawnSandboxServer({ host = "127.0.0.1", port = DEFAULT_PORT, env = process.env } = {}) {
  return spawn(
    process.execPath,
    [resolveSandboxBinary(), "--host", host, "--port", String(port), "--adapter", "memory"],
    { stdio: "inherit", env },
  );
}

/**
 * اگر MongoDB در دسترس نباشد و آدرس لوکال باشد، سرور توسعه را بالا می‌آورد.
 *
 * @returns {Promise<{ target: ReturnType<typeof parseMongoTarget>, started: boolean, child: import("node:child_process").ChildProcess | null, reachable: boolean }>}
 */
export async function connectOrStartDatabase({ uri = resolveMongoUri(), log = () => {} } = {}) {
  const target = parseMongoTarget(uri);
  const alreadyUp = await isPortOpen(target.host, target.port);
  if (alreadyUp) {
    log(`دیتابیس روی ${target.host}:${target.port} در دسترس است.`);
    return { target, started: false, child: null, reachable: true };
  }

  if (!target.isLocal) {
    log(
      `دیتابیس روی ${target.host}:${target.port} پاسخ نمی‌دهد و آدرس «لوکال» نیست؛ ` +
        `سرور خودکار بالا نمی‌آید. (Atlas: IP را whitelist کنید / docker: pnpm docker:up)`,
    );
    return { target, started: false, child: null, reachable: false };
  }

  let child;
  try {
    resolveSandboxBinary();
  } catch {
    log(
      "پکیج @rckflr/easydb-server نصب نیست؛ نمی‌توان دیتابیس توسعه را بالا آورد.\n" +
        "        اول `pnpm install` را اجرا کنید (یا `pnpm docker:up`).",
    );
    return { target, started: false, child: null, reachable: false };
  }

  const bindHost =
    process.env.MONGO_HOST ?? (["0.0.0.0", "::"].includes(target.host) ? target.host : "127.0.0.1");
  log(`دیتابیسی روی ${target.host}:${target.port} نبود؛ سرور توسعه‌ی داخل ریپو را بالا می‌آورم…`);
  log("(داده‌ها در حافظه‌اند و با خاموش‌شدن پاک می‌شوند — برای Mongo واقعی: pnpm docker:up)");

  child = spawnSandboxServer({ host: bindHost, port: target.port });
  const ready = await waitForPort(target.host, target.port);
  if (!ready) {
    log(`سرور دیتابیس روی ${target.host}:${target.port} بالا نیامد.`);
    child.kill("SIGTERM");
    return { target, started: false, child: null, reachable: false };
  }
  log(`دیتابیس توسعه آماده است: ${target.host}:${target.port}`);
  return { target, started: true, child, reachable: true };
}
