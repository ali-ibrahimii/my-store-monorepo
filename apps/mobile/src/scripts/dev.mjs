// ============================================================
// `pnpm --filter @my-store/mobile dev` — اجرای اپ موبایل در مرورگر
//
// این اسکریپت دو کار می‌کند:
//   ۱) Metro (سرور Expo) را روی METRO_PORT بالا می‌آورد
//   ۲) یک پروکسی ساده روی PORT می‌گذارد که:
//        /api/**  → وب‌اپ Next.js (سرور API)
//        بقیه      → Metro
//
// چرا پروکسی لازم است؟ اپ در مرورگر با آدرس relative درخواست می‌زند
// (نه localhost)، بنابراین هم در پیش‌نمایشِ proxy‌شده و هم پشت هر
// دامنه‌ی دیگری کار می‌کند و مشکل CORS هم پیش نمی‌آید.
//
// متغیرهای محیطی:
//   PORT          پورت عمومی پروکسی   (پیش‌فرض 8081)
//   METRO_PORT    پورت داخلی Metro   (پیش‌فرض 8082)
//   METRO_HOST    هاست داخلی Metro   (پیش‌فرض localhost)
//   API_ORIGIN    آدرس وب‌اپ/API     (پیش‌فرض http://127.0.0.1:3000)
// ============================================================

import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";
import { fileURLToPath } from "node:url";

const projectDir = fileURLToPath(new URL("..", import.meta.url));

const PORT = Number(process.env.PORT ?? 8081);
const METRO_PORT = Number(process.env.METRO_PORT ?? 8082);
// Metro معمولاً به `localhost` بایند می‌شود که در Node یعنی IPv6 (::1)؛
// برای همین به‌جای 127.0.0.1 از «localhost» استفاده می‌کنیم (Node خودش
// با autoSelectFamily هر دو خانواده‌ی آدرس را امتحان می‌کند).
const METRO_HOST = process.env.METRO_HOST ?? "localhost";
const METRO_ORIGIN = `http://${METRO_HOST}:${METRO_PORT}`;
const API_ORIGIN = (process.env.API_ORIGIN ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const API_TARGET = new URL(API_ORIGIN);

const log = (message) => console.log(`[mobile-dev] ${message}`);

// ------------------------------------------------------------
// پروکسی HTTP
// ------------------------------------------------------------
function forward(req, res, origin) {
  const target = new URL(req.url, origin);
  const headers = { ...req.headers };
  delete headers.host;
  headers.host = target.host;
  // پیش‌نمایش‌های proxy‌شده origin متفاوت می‌فرستند؛ برای سرور داخلی
  // بی‌معنی است و حذفش بی‌خطر است.
  delete headers.origin;

  const upstream = http.request(target, { method: req.method, headers }, (upstreamRes) => {
    res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
    upstreamRes.pipe(res);
  });

  upstream.on("error", (error) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    const isApi = (req.url ?? "/").startsWith("/api/");
    log(`${req.method} ${req.url} → ${origin} ناموفق بود: ${error.message}`);
    res.writeHead(isApi ? 502 : 503, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        error: isApi
          ? `وب‌اپ/API در دسترس نیست (${API_ORIGIN}). وب‌اپ را با «pnpm dev» بالا بیاورید.`
          : `سرور Metro هنوز آماده نیست (${METRO_ORIGIN}). چند ثانیه صبر کنید و دوباره refresh کنید.`,
      }),
    );
  });

  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  // فقط مسیرهای API به وب‌اپ می‌روند؛ بقیه (bundle، asset، HMR) مال Metro است
  if (url === "/api" || url.startsWith("/api/")) {
    forward(req, res, API_TARGET.origin);
    return;
  }
  forward(req, res, METRO_ORIGIN);
});

// WebSocket (HMR / لاگ‌ها) → Metro
server.on("upgrade", (req, socket, head) => {
  const upstream = net.connect(METRO_PORT, METRO_HOST, () => {
    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [key, value] of Object.entries(req.headers)) {
      if (key.toLowerCase() === "host") continue;
      lines.push(`${key}: ${value}`);
    }
    lines.push(`host: ${METRO_HOST}:${METRO_PORT}`, "", "");
    upstream.write(lines.join("\r\n"));
    if (head?.length) upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.on("clientError", (_error, socket) => socket.end("HTTP/1.1 400 Bad Request\r\n\r\n"));

server.listen(PORT, "0.0.0.0", () => {
  log(`پروکسی آماده است: http://0.0.0.0:${PORT}`);
  log(`  /api/** → ${API_ORIGIN}`);
  log(`  بقیه     → ${METRO_ORIGIN}`);
});

// ------------------------------------------------------------
// Metro / Expo
// ------------------------------------------------------------
const metro = spawn("npx", ["expo", "start", "--web", "--port", String(METRO_PORT), "--localhost"], {
  cwd: projectDir,
  stdio: "inherit",
  env: {
    ...process.env,
    // فقط وقتی ترمینال تعاملی نیست (مثلاً CI یا محیط sandbox) منوی
    // تعاملی Expo را خاموش می‌کنیم؛ در ترمینال خودتان منو و reload
    // خودکار سر جایشان می‌مانند.
    ...(process.stdout.isTTY ? {} : { CI: "1" }),
    EXPO_NO_TELEMETRY: "1",
    PORT: String(METRO_PORT),
  },
});

metro.on("exit", (code) => {
  log(`Metro با کد ${code} بسته شد؛ پروکسی هم بسته می‌شود.`);
  server.close(() => process.exit(code ?? 0));
});

function shutdown(signal) {
  log(`${signal} دریافت شد — در حال بستن…`);
  metro.kill(signal === "SIGINT" ? "SIGINT" : "SIGTERM");
  server.close(() => process.exit(0));
  // اگر Metro گوش نداد، بعد از ۵ ثانیه خودمان خارج می‌شویم
  setTimeout(() => process.exit(0), 5000).unref();
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
