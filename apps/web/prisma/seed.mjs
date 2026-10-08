// ============================================================
// Seed — demo data for development & the sandbox preview.
// Idempotent: skips when the demo store already exists.
// Run: pnpm db:seed
// ============================================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5432/mystore?schema=public",
  // PGlite (sandbox dev-db) is single-user — serialize queries through one connection.
  max: Number(process.env.PRISMA_POOL_MAX ?? 10),
});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** EAN-13 check digit (GS1) */
function ean13(base12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base12[i]) * (i % 2 === 0 ? 1 : 3);
  return `${base12}${(10 - (sum % 10)) % 10}`;
}

async function main() {
  const existing = await prisma.store.findUnique({ where: { slug: "demo-store" } });
  if (existing) {
    console.log("[seed] demo store already exists — skipping");
    return;
  }

  const passwordHash = await bcrypt.hash("123456", 10);

  const store = await prisma.store.create({
    data: {
      name: "فروشگاه نمونه",
      slug: "demo-store",
      currency: "IRR",
      users: {
        create: [
          {
            name: "مدیر فروشگاه",
            email: "owner@mystore.ir",
            passwordHash,
            role: "OWNER",
          },
          {
            name: "صندوق‌دار",
            email: "cashier@mystore.ir",
            passwordHash,
            role: "CASHIER",
          },
        ],
      },
    },
  });
  const [owner] = await prisma.user.findMany({ where: { storeId: store.id } });

  // Categories
  const [catDrinks, catFood, catHome] = await Promise.all([
    prisma.category.create({ data: { storeId: store.id, name: "نوشیدنی", slug: "drinks" } }),
    prisma.category.create({ data: { storeId: store.id, name: "خوراکی", slug: "food" } }),
    prisma.category.create({ data: { storeId: store.id, name: "خانگی", slug: "home" } }),
  ]);

  // Products (valid EAN-13 barcodes)
  const products = [
    { name: "شیر کم‌چرب ۱ لیتری", base: "628111100001", cost: 45000, sale: 52000, stock: 40, cat: catDrinks },
    { name: "آب معدنی ۱.۵ لیتری", base: "628111100002", cost: 12000, sale: 18000, stock: 200, cat: catDrinks },
    { name: "نوشابه cola ۳۳۰ml", base: "628111100003", cost: 18000, sale: 25000, stock: 120, cat: catDrinks },
    { name: "برنج ایرانی ۱۰ کیلویی", base: "628111100004", cost: 850000, sale: 980000, stock: 15, cat: catFood },
    { name: "چای صبحانه ۴۵۰ گرم", base: "628111100005", cost: 120000, sale: 145000, stock: 30, cat: catFood },
    { name: "شکر ۱ کیلویی", base: "628111100006", cost: 38000, sale: 45000, stock: 60, cat: catFood },
    { name: "بیسکوییت ساده ۲۵۰ گرم", base: "628111100007", cost: 22000, sale: 30000, stock: 80, cat: catFood },
    { name: "روغن مایع ۱.۵ لیتری", base: "628111100008", cost: 95000, sale: 115000, stock: 25, cat: catHome },
  ];
  const createdProducts = [];
  for (const p of products) {
    createdProducts.push(
      await prisma.product.create({
        data: {
          storeId: store.id,
          name: p.name,
          barcode: ean13(p.base),
          sku: p.base,
          costPrice: p.cost,
          salePrice: p.sale,
          stock: p.stock,
          lowStockThreshold: 10,
          categoryId: p.cat.id,
        },
      }),
    );
  }

  // Customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: { storeId: store.id, name: "علی محمدی", phone: "09120000001", address: "تهران، خیابان ولیعصر" },
    }),
    prisma.customer.create({
      data: { storeId: store.id, name: "سارا احمدی", phone: "09121111111", address: "تهران، میدان آزادی" },
    }),
    prisma.customer.create({
      data: { storeId: store.id, name: "شرکت پخش مواد غذایی", phone: "09122222222" },
    }),
  ]);

  // Expense categories
  const expenseCategories = await Promise.all(
    ["اجاره", "برق و آب", "حقوق", "حمل‌ونقل", "متفرقه"].map((name) =>
      prisma.expenseCategory.create({ data: { storeId: store.id, name } }),
    ),
  );

  // Sample expense
  await prisma.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        storeId: store.id,
        title: "پرداخت اجاره ماهانه فروشگاه",
        amount: 30000000,
        date: new Date(),
        note: "اجاره ماهانه فروشگاه",
        categoryId: expenseCategories[0].id,
        createdById: owner.id,
      },
    });
    await tx.transaction.createMany({
      data: [
        { storeId: store.id, account: "EXPENSE", type: "DEBIT", amount: 30000000, refType: "expense", refId: expense.id, note: expense.title },
        { storeId: store.id, account: "CASH_BANK", type: "CREDIT", amount: 30000000, refType: "expense", refId: expense.id, note: expense.title },
      ],
    });
  });

  // Sample invoice (PAID) with items + payment + ledger
  await prisma.$transaction(async (tx) => {
    const items = [
      { product: createdProducts[0], qty: 2 }, // شیر
      { product: createdProducts[4], qty: 1 }, // چای
    ];
    const subtotal = items.reduce((s, i) => s + i.qty * Number(i.product.salePrice), 0);
    const invoice = await tx.invoice.create({
      data: {
        storeId: store.id,
        number: "INV-0001",
        status: "PAID",
        customerId: customers[0].id,
        subtotal,
        discount: 0,
        tax: 0,
        total: subtotal,
        paidAmount: subtotal,
        createdById: owner.id,
        issuedAt: new Date(),
        items: {
          create: items.map((i) => ({
            productId: i.product.id,
            qty: i.qty,
            unitPrice: i.product.salePrice,
            total: i.qty * Number(i.product.salePrice),
          })),
        },
        payments: { create: { method: "CASH", amount: subtotal } },
      },
    });
    for (const i of items) {
      await tx.product.update({ where: { id: i.product.id }, data: { stock: { decrement: i.qty } } });
      await tx.inventoryMovement.create({
        data: {
          productId: i.product.id,
          type: "SALE",
          qty: -i.qty,
          refType: "invoice",
          refId: invoice.id,
          note: "فاکتور INV-0001",
        },
      });
    }
    const cogs = items.reduce((s, i) => s + i.qty * Number(i.product.costPrice), 0);
    await tx.transaction.createMany({
      data: [
        { storeId: store.id, account: "CASH_BANK", type: "DEBIT", amount: subtotal, refType: "invoice", refId: invoice.id, note: "INV-0001" },
        { storeId: store.id, account: "SALES_REVENUE", type: "CREDIT", amount: subtotal, refType: "invoice", refId: invoice.id, note: "INV-0001" },
        { storeId: store.id, account: "COGS", type: "DEBIT", amount: cogs, refType: "invoice", refId: invoice.id, note: "INV-0001" },
        { storeId: store.id, account: "INVENTORY", type: "CREDIT", amount: cogs, refType: "invoice", refId: invoice.id, note: "INV-0001" },
        { storeId: store.id, account: "CASH_BANK", type: "DEBIT", amount: subtotal, refType: "payment", refId: invoice.id, note: "پرداخت INV-0001" },
        { storeId: store.id, account: "ACCOUNTS_RECEIVABLE", type: "CREDIT", amount: subtotal, refType: "payment", refId: invoice.id, note: "پرداخت INV-0001" },
      ],
    });
  });

  // A couple of sample scan events so the live feed isn't empty
  await prisma.scanEvent.createMany({
    data: [
      {
        storeId: store.id,
        productId: createdProducts[2].id,
        barcode: createdProducts[2].barcode,
        type: "CHECK_IN",
        qty: 24,
        device: "web-pwa",
        userId: owner.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 5),
      },
      {
        storeId: store.id,
        productId: createdProducts[3].id,
        barcode: createdProducts[3].barcode,
        type: "SALE",
        qty: 1,
        device: "web-pwa",
        userId: owner.id,
        createdAt: new Date(Date.now() - 1000 * 60 * 2),
      },
    ],
  });

  console.log("[seed] ✅ demo store created");
  console.log("[seed] login: owner@mystore.ir / 123456 (OWNER)");
  console.log("[seed]        cashier@mystore.ir / 123456 (CASHIER)");
  console.log(`[seed] ${createdProducts.length} products, ${customers.length} customers`);
  console.log("[seed] sample barcodes:");
  for (const p of createdProducts) {
    console.log(`       ${p.barcode}  ${p.name}`);
  }
}

main()
  .catch((e) => {
    console.error("[seed] failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
