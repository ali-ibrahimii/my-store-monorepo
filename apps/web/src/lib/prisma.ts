import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaPool?: pg.Pool;
};

function createPrismaClient(): PrismaClient {
  const pool =
    globalForPrisma.prismaPool ??
    new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // PGlite (sandbox dev-db) is single-user: one query at a time.
      // Real Postgres can use the full pool. Override with PRISMA_POOL_MAX.
      max: Number(process.env.PRISMA_POOL_MAX ?? 10),
    });
  globalForPrisma.prismaPool = pool;

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
