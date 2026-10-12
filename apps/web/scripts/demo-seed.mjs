// ============================================================
// Demo seed — داده‌ی نمونه برای توسعه و پیش‌نمایش
//
// این فایل «منطق» seed است و هم از اسکریپت خط فرمان
// (scripts/seed.mjs) و هم از خود برنامه (auto-seed در lib/db.ts)
// استفاده می‌شود.
//
// Idempotent: اگر فروشگاه نمونه از قبل باشد، چیزی ساخته نمی‌شود.
// ============================================================

import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

/** EAN-13 check digit (GS1) */
function ean13(base12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base12[i]) * (i % 2 === 0 ? 1 : 3);
  return `${base12}${(10 - (sum % 10)) % 10}`;
}

export const DEMO_CREDENTIALS = {
  storeSlug: "demo-store",
  owner: { email: "owner@mystore.ir", password: "123456", name: "مدیر فروشگاه", role: "OWNER" },
  cashier: { email: "cashier@mystore.ir", password: "123456", name: "صندوق‌دار", role: "CASHIER" },
};

/**
 * @param {import("mongodb").Db} db
 * @param {{ log?: (msg: string) => void }} [options]
 */
export async function runDemoSeed(db, options = {}) {
  const log = options.log ?? (() => {});
  const stores = db.collection("stores");

  const existing = await stores.findOne({ slug: DEMO_CREDENTIALS.storeSlug });
  if (existing) {
    log("فروشگاه نمونه از قبل وجود دارد — seed انجام نشد");
    return { seeded: false, storeId: existing._id };
  }

  const users = db.collection("users");
  const categories = db.collection("categories");
  const products = db.collection("products");
  const customers = db.collection("customers");
  const expenseCategories = db.collection("expense_categories");
  const expenses = db.collection("expenses");
  const invoices = db.collection("invoices");
  const transactions = db.collection("transactions");
  const movements = db.collection("inventory_movements");
  const scanEvents = db.collection("scan_events");

  const now = new Date();
  const storeId = new ObjectId();
  // ارجاع‌ها به‌صورت رشته‌ی hex ذخیره می‌شوند (قرارداد این پروژه)
  const storeRef = storeId.toHexString();
  const ownerRef = new ObjectId().toHexString();
  const cashierRef = new ObjectId().toHexString();
  const catDrinkRef = new ObjectId().toHexString();
  const catFoodRef = new ObjectId().toHexString();
  const catHomeRef = new ObjectId().toHexString();
  const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.owner.password, 10);

  // ---- Store -------------------------------------------------
  await stores.insertOne({
    _id: storeId,
    name: "فروشگاه نمونه",
    slug: DEMO_CREDENTIALS.storeSlug,
    currency: "IRR",
    createdAt: now,
    updatedAt: now,
  });

  // ---- Users -------------------------------------------------
  const ownerId = new ObjectId(ownerRef);
  const cashierId = new ObjectId(cashierRef);
  await users.insertMany([
    {
      _id: ownerId,
      name: DEMO_CREDENTIALS.owner.name,
      email: DEMO_CREDENTIALS.owner.email,
      emailVerified: null,
      passwordHash,
      role: "OWNER",
      storeId: storeRef,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: cashierId,
      name: DEMO_CREDENTIALS.cashier.name,
      email: DEMO_CREDENTIALS.cashier.email,
      emailVerified: null,
      passwordHash,
      role: "CASHIER",
      storeId: storeRef,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  // ---- Categories --------------------------------------------
  const catDrinks = new ObjectId(catDrinkRef);
  const catFood = new ObjectId(catFoodRef);
  const catHome = new ObjectId(catHomeRef);
  const catDairyRef = new ObjectId().toHexString();
  const catSnackRef = new ObjectId().toHexString();
  const catDairy = new ObjectId(catDairyRef);
  const catSnack = new ObjectId(catSnackRef);
  await categories.insertMany([
    { _id: catDrinks, name: "نوشیدنی", slug: "drinks", storeId: storeRef, createdAt: now, updatedAt: now },
    { _id: catFood, name: "خوراکی", slug: "food", storeId: storeRef, createdAt: now, updatedAt: now },
    { _id: catHome, name: "خانگی", slug: "home", storeId: storeRef, createdAt: now, updatedAt: now },
    { _id: catDairy, name: "لبنیات", slug: "dairy", storeId: storeRef, createdAt: now, updatedAt: now },
    { _id: catSnack, name: "تنقلات", slug: "snacks", storeId: storeRef, createdAt: now, updatedAt: now },
  ]);

  // ---- Products (بارکدهای معتبر EAN-13) ----------------------
  const productSeed = [
    { name: "شیر کم‌چرب ۱ لیتری", base: "628111100001", cost: 45000, sale: 52000, stock: 40, categoryId: catDairyRef },
    { name: "آب معدنی ۱.۵ لیتری", base: "628111100002", cost: 12000, sale: 18000, stock: 200, categoryId: catDrinkRef },
    { name: "نوشابه cola ۳۳۰ml", base: "628111100003", cost: 18000, sale: 25000, stock: 120, categoryId: catDrinkRef },
    { name: "برنج ایرانی ۱۰ کیلویی", base: "628111100004", cost: 850000, sale: 980000, stock: 15, categoryId: catFoodRef },
    { name: "چای صبحانه ۴۵۰ گرم", base: "628111100005", cost: 120000, sale: 145000, stock: 30, categoryId: catFoodRef },
    { name: "شکر ۱ کیلویی", base: "628111100006", cost: 38000, sale: 45000, stock: 60, categoryId: catFoodRef },
    { name: "بیسکوییت ساده ۲۵۰ گرم", base: "628111100007", cost: 22000, sale: 30000, stock: 80, categoryId: catSnackRef },
    { name: "روغن مایع ۱.۵ لیتری", base: "628111100008", cost: 95000, sale: 115000, stock: 8, categoryId: catHomeRef },
    { name: "ماست پرچرب ۹۰۰ گرم", base: "628111100009", cost: 55000, sale: 65000, stock: 25, categoryId: catDairyRef },
    { name: "پنیر سفید ۴۰۰ گرم", base: "628111100010", cost: 68000, sale: 82000, stock: 18, categoryId: catDairyRef },
    { name: "کره ۱۰۰ گرمی", base: "628111100011", cost: 72000, sale: 88000, stock: 22, categoryId: catDairyRef },
    { name: "دوغ گازدار ۱.۵ لیتری", base: "628111100012", cost: 25000, sale: 34000, stock: 48, categoryId: catDrinkRef },
    { name: "رب گوجه ۸۰۰ گرم", base: "628111100013", cost: 85000, sale: 102000, stock: 35, categoryId: catFoodRef },
    { name: "ماکارونی ۷۰۰ گرم", base: "628111100014", cost: 42000, sale: 53000, stock: 55, categoryId: catFoodRef },
    { name: "چیپس خلالی ۹۰ گرم", base: "628111100015", cost: 35000, sale: 48000, stock: 64, categoryId: catSnackRef },
    { name: "شکلات تخته‌ای ۱۰۰ گرم", base: "628111100016", cost: 48000, sale: 62000, stock: 42, categoryId: catSnackRef },
    { name: "مایع ظرفشویی ۱ لیتری", base: "628111100017", cost: 62000, sale: 78000, stock: 28, categoryId: catHomeRef },
    { name: "پودر لباسشویی ۲ کیلویی", base: "628111100018", cost: 185000, sale: 225000, stock: 12, categoryId: catHomeRef },
  ];
  const createdProducts = productSeed.map((p) => ({
    _id: new ObjectId(),
    name: p.name,
    sku: p.base,
    barcode: ean13(p.base),
    description: null,
    costPrice: p.cost,
    salePrice: p.sale,
    stock: p.stock,
    lowStockThreshold: 10,
    categoryId: p.categoryId,
    storeId: storeRef,
    createdAt: now,
    updatedAt: now,
  }));
  await products.insertMany(createdProducts);

  // ---- Customers ---------------------------------------------
  const customerDocs = [
    { name: "علی محمدی", phone: "09120000001", address: "تهران، خیابان ولیعصر" },
    { name: "سارا احمدی", phone: "09121111111", address: "تهران، میدان آزادی" },
    { name: "شرکت پخش مواد غذایی", phone: "09122222222", address: null },
    { name: "رضا کریمی", phone: "09123333333", address: "تهران، خیابان شریعتی" },
    { name: "مریم حسینی", phone: "09124444444", address: "کرج، میدان کرج" },
  ].map((c) => ({
    _id: new ObjectId(),
    ...c,
    balance: 0,
    storeId: storeRef,
    createdAt: now,
    updatedAt: now,
  }));
  await customers.insertMany(customerDocs);

  // ---- Expense categories ------------------------------------
  const expenseCatDocs = ["اجاره", "برق و آب", "حقوق", "حمل‌ونقل", "متفرقه"].map((name) => ({
    _id: new ObjectId(),
    name,
    storeId: storeRef,
  }));
  await expenseCategories.insertMany(expenseCatDocs);

  // ---- یک هزینه‌ی نمونه + سند دفتر کل ------------------------
  const expenseId = new ObjectId();
  await expenses.insertOne({
    _id: expenseId,
    title: "پرداخت اجاره ماهانه فروشگاه",
    amount: 30_000_000,
    date: now,
    note: "اجاره ماهانه فروشگاه",
    receiptUrl: null,
    categoryId: expenseCatDocs[0]._id.toHexString(),
    storeId: storeRef,
    createdById: ownerRef,
    createdAt: now,
  });
  await transactions.insertMany([
    {
      _id: new ObjectId(),
      date: now,
      account: "EXPENSE",
      type: "DEBIT",
      amount: 30_000_000,
      refType: "expense",
      refId: expenseId.toHexString(),
      note: "پرداخت اجاره ماهانه فروشگاه",
      storeId: storeRef,
      createdAt: now,
    },
    {
      _id: new ObjectId(),
      date: now,
      account: "CASH_BANK",
      type: "CREDIT",
      amount: 30_000_000,
      refType: "expense",
      refId: expenseId.toHexString(),
      note: "پرداخت اجاره ماهانه فروشگاه",
      storeId: storeRef,
      createdAt: now,
    },
  ]);

  // ---- یک فاکتور فروش نمونه (پرداخت‌شده) --------------------
  const invoiceId = new ObjectId();
  const picked = [
    { product: createdProducts[0], qty: 2 }, // شیر
    { product: createdProducts[4], qty: 1 }, // چای
  ];
  const subtotal = picked.reduce((s, i) => s + i.qty * i.product.salePrice, 0);
  const cogs = picked.reduce((s, i) => s + i.qty * i.product.costPrice, 0);

  await invoices.insertOne({
    _id: invoiceId,
    number: "INV-0001",
    status: "PAID",
    customerId: customerDocs[0]._id.toHexString(),
    items: picked.map((i) => ({
      _id: new ObjectId().toHexString(),
      productId: i.product._id.toHexString(),
      qty: i.qty,
      unitPrice: i.product.salePrice,
      total: i.qty * i.product.salePrice,
    })),
    payments: [
      {
        _id: new ObjectId().toHexString(),
        method: "CASH",
        amount: subtotal,
        note: null,
        createdAt: now,
      },
    ],
    subtotal,
    discount: 0,
    tax: 0,
    total: subtotal,
    paidAmount: subtotal,
    note: null,
    storeId: storeRef,
    createdById: ownerRef,
    issuedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  // کاهش موجودی + حرکت انبار
  for (const i of picked) {
    await products.updateOne({ _id: i.product._id }, { $inc: { stock: -i.qty } });
    await movements.insertOne({
      _id: new ObjectId(),
      productId: i.product._id.toHexString(),
      type: "SALE",
      qty: -i.qty,
      refType: "invoice",
      refId: invoiceId.toHexString(),
      note: "فاکتور INV-0001",
      createdAt: now,
    });
  }

  // اسناد دفتر کل فاکتور
  const invoiceHex = invoiceId.toHexString();
  await transactions.insertMany([
    { _id: new ObjectId(), date: now, account: "ACCOUNTS_RECEIVABLE", type: "DEBIT", amount: subtotal, refType: "invoice", refId: invoiceHex, note: "INV-0001", storeId: storeRef, createdAt: now },
    { _id: new ObjectId(), date: now, account: "SALES_REVENUE", type: "CREDIT", amount: subtotal, refType: "invoice", refId: invoiceHex, note: "INV-0001", storeId: storeRef, createdAt: now },
    { _id: new ObjectId(), date: now, account: "COGS", type: "DEBIT", amount: cogs, refType: "invoice", refId: invoiceHex, note: "INV-0001", storeId: storeRef, createdAt: now },
    { _id: new ObjectId(), date: now, account: "INVENTORY", type: "CREDIT", amount: cogs, refType: "invoice", refId: invoiceHex, note: "INV-0001", storeId: storeRef, createdAt: now },
    { _id: new ObjectId(), date: now, account: "CASH_BANK", type: "DEBIT", amount: subtotal, refType: "payment", refId: invoiceHex, note: "پرداخت INV-0001", storeId: storeRef, createdAt: now },
    { _id: new ObjectId(), date: now, account: "ACCOUNTS_RECEIVABLE", type: "CREDIT", amount: subtotal, refType: "payment", refId: invoiceHex, note: "پرداخت INV-0001", storeId: storeRef, createdAt: now },
  ]);

  // ---- چند رویداد اسکن تا فید زنده خالی نباشد -----------------
  await scanEvents.insertMany([
    {
      _id: new ObjectId(),
      productId: createdProducts[2]._id.toHexString(),
      barcode: createdProducts[2].barcode,
      type: "CHECK_IN",
      qty: 24,
      device: "web-pwa",
      note: null,
      userId: ownerRef,
      storeId: storeRef,
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
    },
    {
      _id: new ObjectId(),
      productId: createdProducts[3]._id.toHexString(),
      barcode: createdProducts[3].barcode,
      type: "SALE",
      qty: 1,
      device: "web-pwa",
      note: null,
      userId: ownerRef,
      storeId: storeRef,
      createdAt: new Date(Date.now() - 1000 * 60 * 2),
    },
  ]);
  await products.updateOne({ _id: createdProducts[2]._id }, { $inc: { stock: 24 } });
  await products.updateOne({ _id: createdProducts[3]._id }, { $inc: { stock: -1 } });

  log("✅ فروشگاه نمونه ساخته شد");
  log(`ورود: ${DEMO_CREDENTIALS.owner.email} / ${DEMO_CREDENTIALS.owner.password} (مالک)`);
  log(`ورود: ${DEMO_CREDENTIALS.cashier.email} / ${DEMO_CREDENTIALS.cashier.password} (صندوق‌دار)`);
  log(`${createdProducts.length} محصول، ${customerDocs.length} مشتری`);

  return { seeded: true, storeId, products: createdProducts };
}
