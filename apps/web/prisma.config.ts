import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  // Prisma Client generation does not connect to a database. Keep the
  // datasource optional so `prisma generate` also works before local env vars
  // (or a database) have been configured. Database commands still require
  // DATABASE_URL to be set.
  ...(process.env.DATABASE_URL
    ? { datasource: { url: process.env.DATABASE_URL } }
    : {}),
});
