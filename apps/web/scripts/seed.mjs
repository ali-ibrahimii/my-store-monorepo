// داده‌ی نمونه روی سوپابیس.
// پیش‌نیاز: اسکیما اجرا شده باشد و .env.local پر باشد.
//
//   pnpm db:seed
//
// حساب‌ها:
//   admin@mystore.ir   / 123456   مدیر
//   cashier@mystore.ir / 123456   صندوق‌دار

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const webDir = fileURLToPath(new URL("..", import.meta.url));

function loadEnv() {
  const file = path.join(webDir, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const key =
  process.env.SUPABASE_SECRET_KEY?.trim() ||
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  "";
const isPlaceholder = (value) =>
  !value ||
  value.includes("YOUR_PROJECT") ||
  value.includes("your-secret-key") ||
  value.includes("your-service-role-key");

if (isPlaceholder(url) || isPlaceholder(key)) {
  console.error(
    "[seed] برای اجرا، NEXT_PUBLIC_SUPABASE_URL و کلید محرمانه‌ی سرور را در apps/web/.env.local تنظیم کنید.",
  );
  if (isPlaceholder(key)) {
    console.error(
      "[seed] یکی از SUPABASE_SECRET_KEY (کلید جدید sb_secret_...) یا SUPABASE_SERVICE_ROLE_KEY (کلید قدیمی service_role) لازم است.",
    );
    console.error(
      "[seed] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY که برای مرورگر است جایگزین این کلید نمی‌شود؛ کلید محرمانه را در Dashboard سوپابیس بسازید و فقط روی سرور نگه دارید.",
    );
  }
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const PRODUCTS = [
  ["شیر کم‌چرب", "6281111000019", "نوشیدنی", 28000, 42000, 24],
  ["آب معدنی", "6281111000026", "نوشیدنی", 6000, 12000, 48],
  ["نوشابه", "6281111000033", "نوشیدنی", 18000, 28000, 36],
  ["برنج", "6281111000040", "خوراکی", 180000, 240000, 12],
  ["چای", "6281111000057", "خوراکی", 85000, 120000, 18],
  ["شکر", "6281111000064", "خوراکی", 42000, 58000, 20],
  ["بیسکوییت", "6281111000071", "تنقلات", 22000, 35000, 30],
  ["روغن", "6281111000088", "خوراکی", 96000, 135000, 14],
  ["ماست", "6281111000095", "لبنیات", 24000, 36000, 16],
  ["پنیر", "6281111000101", "لبنیات", 54000, 78000, 10],
];

async function ensureUser({ email, password, name, role, storeId }) {
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing?.id) return existing.id;

  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { role, store_id: storeId },
    user_metadata: { name },
  });
  if (created.error || !created.data.user) {
    throw new Error(created.error?.message ?? "ساخت کاربر ناموفق بود");
  }
  const inserted = await admin.from("profiles").insert({
    id: created.data.user.id,
    store_id: storeId,
    name,
    email,
    role,
    active: true,
  });
  if (inserted.error) throw new Error(inserted.error.message);
  return created.data.user.id;
}

async function main() {
  let storeId;
  const found = await admin.from("stores").select("id").eq("slug", "mystore").maybeSingle();
  if (found.error) throw new Error(found.error.message);
  if (found.data?.id) {
    storeId = found.data.id;
    console.log("[seed] فروشگاه نمونه از قبل هست");
  } else {
    const created = await admin
      .from("stores")
      .insert({
        name: "فروشگاه من",
        slug: "mystore",
        currency: "IRR",
        phone: "02100000000",
        address: "تهران",
        tax_rate: 0,
        invoice_prefix: "INV",
        receipt_footer: "از خرید شما متشکریم",
        low_stock_default: 5,
      })
      .select("id")
      .single();
    if (created.error) throw new Error(created.error.message);
    storeId = created.data.id;
    console.log("[seed] فروشگاه ساخته شد");
  }

  const adminId = await ensureUser({
    email: "admin@mystore.ir",
    password: "123456",
    name: "مدیر فروشگاه",
    role: "ADMIN",
    storeId,
  });
  await ensureUser({
    email: "cashier@mystore.ir",
    password: "123456",
    name: "صندوق‌دار",
    role: "CASHIER",
    storeId,
  });

  const categories = new Map();
  for (const name of ["نوشیدنی", "خوراکی", "تنقلات", "لبنیات"]) {
    const existing = await admin
      .from("categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", name)
      .maybeSingle();
    if (existing.data?.id) {
      categories.set(name, existing.data.id);
      continue;
    }
    const inserted = await admin
      .from("categories")
      .insert({ store_id: storeId, name, slug: name })
      .select("id")
      .single();
    if (inserted.error) throw new Error(inserted.error.message);
    categories.set(name, inserted.data.id);
  }

  for (const [name, barcode, category, cost, sale, stock] of PRODUCTS) {
    const existing = await admin
      .from("products")
      .select("id")
      .eq("store_id", storeId)
      .eq("barcode", barcode)
      .maybeSingle();
    if (existing.data) continue;
    const inserted = await admin.from("products").insert({
      store_id: storeId,
      category_id: categories.get(category),
      name,
      barcode,
      cost_price: cost,
      sale_price: sale,
      stock,
      low_stock_threshold: 5,
    });
    if (inserted.error) throw new Error(inserted.error.message);
  }

  const customer = await admin
    .from("customers")
    .select("id")
    .eq("store_id", storeId)
    .eq("name", "مشتری نمونه")
    .maybeSingle();
  if (!customer.data) {
    await admin.from("customers").insert({
      store_id: storeId,
      name: "مشتری نمونه",
      phone: "09120000000",
      address: "تهران",
    });
  }

  for (const name of ["اجاره", "قبوض", "حمل"]) {
    const existing = await admin
      .from("expense_categories")
      .select("id")
      .eq("store_id", storeId)
      .eq("name", name)
      .maybeSingle();
    if (!existing.data) {
      await admin.from("expense_categories").insert({ store_id: storeId, name });
    }
  }

  console.log("[seed] تمام شد");
  console.log("  مدیر      admin@mystore.ir / 123456");
  console.log("  صندوق‌دار cashier@mystore.ir / 123456");
  console.log("  store", storeId, "admin", adminId);
}

main().catch((error) => {
  console.error("[seed]", error.message ?? error);
  process.exit(1);
});
