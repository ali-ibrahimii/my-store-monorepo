-- ============================================================
-- Sandbox-only DDL — mirrors apps/web/prisma/schema.prisma
-- (the Prisma CLI cannot download its schema engine in the
--  sandbox, so this file creates the same tables/types in PGlite.
--  In the real environment use `pnpm db:push` / `pnpm db:migrate`.)
-- Idempotent: safe to run on every boot.
-- ============================================================

-- Enums (what prisma db push would create as CREATE TYPE ... AS ENUM)
DO $$ BEGIN
  CREATE TYPE "Role" AS ENUM ('OWNER', 'ACCOUNTANT', 'CASHIER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "MovementType" AS ENUM ('PURCHASE', 'SALE', 'ADJUSTMENT', 'SCAN_IN', 'SCAN_OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'PARTIAL', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerAccount" AS ENUM ('CASH_BANK', 'SALES_REVENUE', 'COGS', 'INVENTORY', 'ACCOUNTS_RECEIVABLE', 'ACCOUNTS_PAYABLE', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LedgerType" AS ENUM ('DEBIT', 'CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ScanType" AS ENUM ('SALE', 'COUNT', 'CHECK_IN', 'CHECK_OUT', 'ADJUSTMENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "Store" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'IRR',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT NOT NULL UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  "passwordHash" TEXT,
  role "Role" NOT NULL DEFAULT 'CASHIER',
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Account" (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  scope TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS "Session" (
  id TEXT PRIMARY KEY,
  "sessionToken" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "VerificationToken" (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires TIMESTAMPTZ NOT NULL,
  UNIQUE (identifier, token)
);

CREATE TABLE IF NOT EXISTS "Category" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("storeId", slug)
);

CREATE TABLE IF NOT EXISTS "Product" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT NOT NULL,
  description TEXT,
  "costPrice" NUMERIC NOT NULL DEFAULT 0,
  "salePrice" NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  "lowStockThreshold" INTEGER NOT NULL DEFAULT 5,
  "categoryId" TEXT REFERENCES "Category"(id) ON DELETE SET NULL,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("storeId", barcode)
);
CREATE INDEX IF NOT EXISTS "Product_storeId_name_idx" ON "Product"("storeId", name);

CREATE TABLE IF NOT EXISTS "InventoryMovement" (
  id TEXT PRIMARY KEY,
  "productId" TEXT NOT NULL REFERENCES "Product"(id) ON DELETE CASCADE,
  type "MovementType" NOT NULL,
  qty INTEGER NOT NULL,
  "refType" TEXT,
  "refId" TEXT,
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "InventoryMovement_productId_createdAt_idx" ON "InventoryMovement"("productId", "createdAt");

CREATE TABLE IF NOT EXISTS "Customer" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  balance NUMERIC NOT NULL DEFAULT 0,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Customer_storeId_name_idx" ON "Customer"("storeId", name);

CREATE TABLE IF NOT EXISTS "Invoice" (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  status "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "customerId" TEXT REFERENCES "Customer"(id) ON DELETE SET NULL,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  "paidAmount" NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id),
  "issuedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("storeId", number)
);
CREATE INDEX IF NOT EXISTS "Invoice_storeId_createdAt_idx" ON "Invoice"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_storeId_status_idx" ON "Invoice"("storeId", status);

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  id TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "Invoice"(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"(id),
  qty INTEGER NOT NULL,
  "unitPrice" NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS "Purchase" (
  id TEXT PRIMARY KEY,
  number TEXT NOT NULL,
  supplier TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  "paidAmount" NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("storeId", number)
);
CREATE INDEX IF NOT EXISTS "Purchase_storeId_createdAt_idx" ON "Purchase"("storeId", "createdAt");

CREATE TABLE IF NOT EXISTS "PurchaseItem" (
  id TEXT PRIMARY KEY,
  "purchaseId" TEXT NOT NULL REFERENCES "Purchase"(id) ON DELETE CASCADE,
  "productId" TEXT NOT NULL REFERENCES "Product"(id),
  qty INTEGER NOT NULL,
  "unitCost" NUMERIC NOT NULL,
  total NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  UNIQUE ("storeId", name)
);

CREATE TABLE IF NOT EXISTS "Expense" (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  "receiptUrl" TEXT,
  "categoryId" TEXT REFERENCES "ExpenseCategory"(id) ON DELETE SET NULL,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdById" TEXT NOT NULL REFERENCES "User"(id),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Expense_storeId_date_idx" ON "Expense"("storeId", date);

CREATE TABLE IF NOT EXISTS "Payment" (
  id TEXT PRIMARY KEY,
  "invoiceId" TEXT NOT NULL REFERENCES "Invoice"(id) ON DELETE CASCADE,
  method "PaymentMethod" NOT NULL DEFAULT 'CASH',
  amount NUMERIC NOT NULL,
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");

CREATE TABLE IF NOT EXISTS "PurchasePayment" (
  id TEXT PRIMARY KEY,
  "purchaseId" TEXT NOT NULL REFERENCES "Purchase"(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  note TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "PurchasePayment_purchaseId_idx" ON "PurchasePayment"("purchaseId");

CREATE TABLE IF NOT EXISTS "Transaction" (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  account "LedgerAccount" NOT NULL,
  type "LedgerType" NOT NULL,
  amount NUMERIC NOT NULL,
  "refType" TEXT,
  "refId" TEXT,
  note TEXT,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "Transaction_storeId_date_idx" ON "Transaction"("storeId", date);
CREATE INDEX IF NOT EXISTS "Transaction_storeId_account_idx" ON "Transaction"("storeId", account);
CREATE INDEX IF NOT EXISTS "Transaction_refType_refId_idx" ON "Transaction"("refType", "refId");

CREATE TABLE IF NOT EXISTS "ScanEvent" (
  id TEXT PRIMARY KEY,
  "productId" TEXT REFERENCES "Product"(id) ON DELETE SET NULL,
  barcode TEXT NOT NULL,
  type "ScanType" NOT NULL DEFAULT 'CHECK_IN',
  qty INTEGER NOT NULL DEFAULT 1,
  device TEXT,
  note TEXT,
  "userId" TEXT REFERENCES "User"(id) ON DELETE SET NULL,
  "storeId" TEXT NOT NULL REFERENCES "Store"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "ScanEvent_storeId_createdAt_idx" ON "ScanEvent"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "ScanEvent_barcode_idx" ON "ScanEvent"(barcode);
