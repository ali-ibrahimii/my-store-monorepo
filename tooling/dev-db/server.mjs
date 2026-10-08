// Sandbox-only development database: real PostgreSQL (PGlite, WASM) exposed
// over the postgres wire protocol on port 5432.
//
// The production/dev setup for the project is docker-compose (PostgreSQL 16 +
// Redis 7). This server exists so the app can run in environments where
// Docker is unavailable (e.g. the Arena sandbox preview).
//
// Usage:  pnpm --filter @my-store/dev-db start

import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(here, "data");
mkdirSync(dataDir, { recursive: true });

const port = Number(process.env.PG_PORT ?? 5432);
const host = process.env.PG_HOST ?? "0.0.0.0";

const db = new PGlite({ dataDir });

// Apply the sandbox DDL (mirrors prisma/schema.prisma) on every boot.
// Idempotent — CREATE TABLE IF NOT EXISTS.
const schemaSql = readFileSync(resolve(here, "schema.sql"), "utf8");
await db.exec(schemaSql);
console.log("[dev-db] schema applied (schema.sql)");

const server = new PGLiteSocketServer({
  db,
  port,
  host,
});

await server.start();

console.log(`[dev-db] PGlite (PostgreSQL in WASM) listening on ${host}:${port}`);
console.log(`[dev-db] data dir: ${dataDir}`);
console.log(`[dev-db] connect with: postgresql://postgres:password@localhost:${port}/mystore`);

async function shutdown() {
  console.log("\n[dev-db] shutting down...");
  await server.close();
  await db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
