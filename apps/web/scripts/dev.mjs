import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const webDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = require.resolve("next/dist/bin/next");
const envFile = path.join(webDir, ".env.local");
const example = path.join(webDir, ".env.example");

if (!fs.existsSync(envFile) && fs.existsSync(example)) {
  fs.copyFileSync(example, envFile);
  console.log("[dev] apps/web/.env.local از نمونه ساخته شد — کلیدهای سوپابیس را پر کنید.");
}

const port = process.env.PORT || process.env.DEV_PORT || "3000";
const host = process.env.HOST || "0.0.0.0";
const child = spawn(process.execPath, [nextBin, "dev", "--hostname", host, "--port", port], {
  cwd: webDir,
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
