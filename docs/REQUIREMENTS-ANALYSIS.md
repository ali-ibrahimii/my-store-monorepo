# گزارش بررسی پروژه و نیازمندی‌ها

> پروژه: `my-store-monorepo` — پلتفرم مدیریت فروشگاه (فروش، انبار، حساب‌داری، اسکن بارکد)
> تاریخ بررسی: ۱۴۰۵/۰۷/۱۵ · نسخه Next.js: 16.2.9 · React 19.2 · Prisma 7.10

---

## ۱. وضعیت فعلی پروژه (Audit)

### ۱.۱ ساختار

```
my-store-monorepo/
├── apps/
│   ├── web/          Next.js 16 (App Router) + React 19 + Tailwind v4 + shadcn/ui
│   └── mobile/       اسکلت Expo Router (خالی — بدون محتوا)
├── packages/
│   ├── shared-types/   تایپ‌های مشترک (product, order, user) — خالی بود
│   ├── shared-utils/   barcode, formatters, validation, constants — خالی بود
│   ├── api-client/     کلاینت API (products, orders) — خالی بود
│   └── ui-kit/         کامپوننت‌های UI — خالی بود
├── docker-compose.yaml  PostgreSQL 16 + Redis 7
├── turbo.json            ارکستراسیون build/dev/lint
└── pnpm-workspace.yaml   apps/* + packages/* + tooling/*
```

### ۱.۲ چه چیزهایی نصب شده (dependencies در `apps/web/package.json`)

| دسته | پکیج‌ها | کاربرد |
|---|---|---|
| Framework | `next@16.2.9`, `react@19.2.4` | اپلیکیشن وب |
| Database | `prisma@7.10`, `@prisma/client@7.10` | ORM روی PostgreSQL |
| Auth | `next-auth@5.0.0-beta.31`, `@auth/prisma-adapter`, `bcryptjs` | ورود/ثبت‌نام + نقش‌ها |
| UI | `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `tailwindcss@4`, `tw-animate-css`, `lucide-react`, `shadcn` | سیستم دیزاین (components.json آماده است) |
| Data fetching | `@tanstack/react-query`, `zustand`, `axios` | استیت سرور + کلاینت |
| اسکنر | `html5-qrcode@2.3.8` | اسکن بارکد/QR با دوربین مرورگر گوشی |
| Real-time | `ioredis@5.11` | Pub/Sub برای همگام‌سازی لحظه‌ای |
| Validation | `zod@4` | اعتبارسنجی schema (zod) |
| Payment | `stripe`, `@stripe/stripe-js` | پرداخت آنلاین |

### ۱.۳ مشکلات پیدا شده و رفع‌شده

| # | مشکل | وضعیت |
|---|---|---|
| 1 | **هیچ پکیجی نصب نشده بود** (`node_modules` وجود نداشت) | ✅ رفع شد — `pnpm install` (۸۳۰ پکیج) |
| 2 | `package.json` همه ۴ پکیج `packages/*` **خالی و نامعتبر** بود → install fail می‌شد | ✅ رفع شد — package.json معتبر |
| 3 | `layout.tsx` فایل `./globals.css` را import می‌کرد ولی **وجود نداشت** → build fail | ✅ رفع شد — `globals.css` (Tailwind v4 + theme shadcn (neutral)) |
| 4 | **هیچ صفحه اصلی** (`page.tsx`) وجود نداشت | ✅ رفع شد — landing page فارسی (RTL) |
| 5 | `next/font/google` (Geist) — build به Google Fonts وصل می‌شود که در این محیط **بسته است** | ✅ رفع شد — font stack سیستمی |
| 6 | **دو lockfile** (root + `apps/web`) → warning در build | ✅ رفع شد — `turbopack.root` در next.config |
| 7 | **Prisma schema وجود ندارد** (`pnpm db:push` کار نمی‌کند) | ⏳ در Phase 1 پیاده‌سازی می‌شود |
| 8 | **هیچ `.env`** وجود ندارد | ✅ `.env.example` ساخته شد — `.env.local` را کپی کنید |
| 9 | `apps/mobile`: همه فایل‌ها خالی‌ان، `package.json` به اشتباه داخل `src/` است و در workspace نیست | ⏳ نیاز به تصمیم (سؤال ۲) |
| 10 | `apps/web/pnpm-lock.yaml` + `apps/web/pnpm-workspace.yaml` **stale** هستند (از دوران standalone) | ⚠️ پیشنهاد: پاک شوند (lockfile روت governance می‌کند) |
| 11 | docker در این sandbox نیست → Postgres/Redis باید روی سیستم شما (`pnpm docker:up`) بالا بیایند | ℹ️ برای بعد |

**نتیجه:** `pnpm install` ✅ و `pnpm --filter web build` ✅ سبز است.

### ۱.۴ نکات مهم نسخه Next.js 16 (طبق دستور AGENTS.md، docs داخل node_modules خوانده شد)

- `params` و `searchParams` در صفحات **async** هستند (Promise) — دسترسی synchronous حذف شده.
- **Middleware به `proxy.ts`** تغییر نام داد (همان کار، فایل جدید).
- Route handlers از **streaming (ReadableStream)** پشتیبانی می‌کنند → برای SSE ریل‌تایم عالی است.
- `transpilePackages` برای پکیج‌های workspace (`@my-store/*`) — اضافه شد.
- PWA داخلی دارد (`app/manifest.ts` + `public/sw.js`) → برای اسکنر گوشی کلیدی است.

---

## ۲. نیازمندی‌های «حالت حساب‌داری» (Accounting Mode)

### ۲.۱ نیازمندی‌های کاربری (Functional)

1. **طرف‌حساب** (Customer / Supplier): نام، تلفن، آدرس, مانده بدهی/بستانکاری
2. **فاکتور فروش** (Invoice): آیتم‌ها (محصول × تعداد × قیمت)، تخفیف، مالیات، وضعیت پرداخت (نقدی / کارت / اعتباری / قسطی)
3. **فاکتور خرید** (Purchase): افزایش موجودی انبار + ثبت بدهی به فروشنده
4. **هزینه‌ها** (Expense): دسته‌بندی (اجاره، برق، حقوق…)، مبلغ، تاریخ، رسید (پیوست)
5. **انبارداری متصل به حساب‌داری**: هر فاکتور فروش → کاهش خودکار موجودی + ثبت خودکار تراکنش مالی (COGS)
6. **گزارش‌ها**:
   - سود و زیان (Profit & Loss) بازه‌ای
   - فروش روزانه / ماهانه
   - ارزش موجودی انبار (Inventory Valuation)
   - جریان نقدی (Cash Flow)
7. **داشبورد مالی**: درآمد امروز/این ماه، هزینه‌ها، سود خالص، موجودی انبار
8. **ارز**: تومان (IRR) — formatter در `shared-utils/formatters.ts`
9. **نقش‌ها**: OWNER (همه)، ACCOUNTANT (مالی)، CASHIER (فقط فروش/اسکن)

### ۲.۲ مدل داده (Prisma — طرح)

```prisma
Store, User(role), Customer,
Category, Product(barcode @unique, costPrice, salePrice, stock),
InventoryMovement(type: SALE|PURCHASE|ADJUST|SCAN, qty, ref),
Invoice(status, customerId, items[], payments[], total, discount, tax),
InvoiceItem(productId, qty, unitPrice),
Expense(categoryId, amount, date, note, receiptUrl),
ExpenseCategory, Payment(method, amount, invoiceId),
Transaction(ledger: DEBIT/CREDIT, account, amount, ref),   // دفتر کل
ScanEvent(productId, qty, type, userId, device, createdAt) // اسکنر
```

### ۲.۳ API Routes (پیشنهادی)

```
POST/GET   /api/invoices          CRUD فاکتور فروش
POST/GET   /api/purchases         فاکتور خرید
POST/GET   /api/expenses          هزینه‌ها
GET/POST   /api/customers         طرف‌حساب
GET        /api/reports/summary   داشبورد مالی
GET        /api/reports/profit-loss   گزارش سود و زیان
GET/POST   /api/products          محصولات + جستجوی بارکد
GET        /api/products/lookup?barcode=...   lookup برای اسکنر
POST       /api/scan               ثبت رویداد اسکن (real-time)
GET        /api/scan/stream        SSE — فید لحظه‌ای اسکن‌ها
```

---

## ۳. نیازمندی‌های «اسکنر گوشی + ذخیره ریل‌تایم»

### ۳.۱ سناریو

کاربر گوشی را جلوی بارکد محصول می‌گیرد → دوربین روشن می‌شود → بارکد خوانده می‌شود → محصول از API لود می‌شود → تعداد وارد می‌شود → **بلافاصله** در دیتابیس ذخیره می‌شود و روی **همه دستگاه‌های آنلاین** (مثلاً کامپیوتر صندوق) **لحظه‌ای** نمایش داده می‌شود.

### ۳.۲ اجزای سیستم

| بخش | تکنولوژی | توضیح |
|---|---|---|
| اسکن دوربین | `html5-qrcode` (نصب شده ✅) | EAN-13, EAN-8, UPC-A/E, Code128, Code39, QR… |
| صفحه اسکن | `/scan` (PWA) | تمام‌صفحه، مناسب موبایل |
| PWA | `app/manifest.ts` + `public/sw.js` | «افزودن به صفحه اصلی» → تجربه اپ‌مانند |
| امنیت دوربین | **HTTPS اجباری است** (secure context) | preview ما HTTPS است ✅ — localhost هم OK است |
| Utilities بارکد | `shared-utils/barcode.ts` | چک‌سام EAN-13، تبدیل UPC-A→EAN-13، normalize |
| ذخیره | `POST /api/scan` → Postgres (Prisma) | ثبت ScanEvent + به‌روزرسانی موجودی |
| Real-time | **SSE** (`/api/scan/stream`) + **Redis Pub/Sub** | fallback in-memory برای single-instance |
| UI ریل‌تایم | react-query (invalidate) + zustand (optimistic) | فید زنده اسکن‌ها + لرزش/صدا |

### ۳.۳ چرا SSE و نه WebSocket؟

- Route Handlerهای Next.js از `ReadableStream` پشتیبانی می‌کنند — **نیازی به پکیج اضافی نیست**
- یک‌طرفه (server→client) برای فید اسکن کافی است
- با Redis Pub/Sub بین چند instance هم scale می‌شود
- client → server هم با POST معمولی (fetch) انجام می‌شود

### ۳.۴ گزینه جایگزین: اپلیکیشن Expo (`apps/mobile`)

یک اسکلت Expo Router با `tabs/scanner.tsx` وجود دارد (کاملاً خالی). ساخت اپ native:

- ✅ دوربین native (expo-camera / expo-barcode-scanning) — کیفیت بالاتر
- ❌ نیاز به build native، app store، و سنگین‌تر
- ❌ در این sandbox قابل preview نیست

**پیشنهاد:** اول PWA وب (سریع، بدون نصب، ریل‌تایم)، بعد در صورت نیاز اپ Expo.

---

## ۴. معماری پیشنهادی (Data Flow)

```
 📱 گوشی (دوربین)              💻 سرور Next.js               🗄️ Postgres + Redis
 ┌──────────────┐  POST /api/scan ┌─────────────────────┐     ┌─────────────┐
 │ html5-qrcode │ ───────────────▶│  Route Handler      │────▶│ ScanEvent   │
 │ /scan (PWA)  │                 │  + InventoryMovement│     │ Product.stock│
 │              │◀──── SSE ──────│  Redis Pub/Sub ◀────┼─────│ Redis       │
 │ فید زنده     │  /api/scan/stream│ Route Handler (SSE) │     └─────────────┘
 └──────────────┘   (real-time)   └─────────────────────┘
        ▲                                    │
        └──── react-query invalidate ◀───────┘
```

**پکیج‌های مشترک** (همه TS source — با `transpilePackages`):

- `@my-store/shared-types` — Product, Order, Invoice, Expense, ScanEvent, User…
- `@my-store/shared-utils` — barcode (چک‌سام/normalize)، formatters (IRR، تاریخ)، validation, constants
- `@my-store/api-client` — fetch تایپ‌دار برای web + mobile
- `@my-store/ui-kit` — Button, Card, Input, Badge… (CVA + cn)

---

## ۵. طرح اجرایی فازبندی‌شده

| فاز | محتوا | زمان تقریبی |
|---|---|---|
| **0** ✅ | تعمیر اسکلت: install، package.jsonها، globals.css، صفحه اصلی، build سبز | انجام شد |
| **1** | Prisma schema (کل مدل داده) + migrate + NextAuth v5 (Credentials + roles) + CRUD محصولات | ۱-۲ روز |
| **2** | اسکنر: `/scan` + html5-qrcode + PWA manifest/sw + `POST /api/scan` + SSE + Redis Pub/Sub + فید زنده | ۱-۲ روز |
| **3** | حساب‌داری: فاکتور فروش/خرید، هزینه، طرف‌حساب، گزارش سود و زیان، داشبورد مالی | ۲-۳ روز |
| **4** | (اختیاری) اپ Expo `apps/mobile` با اسکنر native | ۲-۳ روز |
| **5** | Stripe پرداخت + تست + polish | ۱ روز |

---

## ۶. سؤالات باز (نیاز به تصمیم شما)

1. **زبان/جهت UI**: فارسی + RTL (پیش‌فرض فعلی) یا انگلیسی LTR؟ اعداد فارسی یا latin?
2. **اسکنر**: PWA وب (پیشنهاد — سریع و ریل‌تایم) یا اپ Expo native (`apps/mobile`)؟ یا هر دو؟
3. **محدوده حساب‌داری**: حساب‌داری کامل (دفتر کل، ترازنامه) یا فقط «درآمد/هزینه/سود ساده»؟
4. **ارز**: تومان (IRR)؟
5. **stale lockfiles** (`apps/web/pnpm-lock.yaml`) پاک شوند؟

---

## ۷. راه‌اندازی لوکال (برای شما)

```bash
# 1. دیتابیس و Redis
pnpm docker:up          # یا: docker-compose up -d

# 2. متغیرهای محیطی
cp apps/web/.env.example apps/web/.env.local

# 3. migrate (بعد از Phase 1)
pnpm db:push            # یا pnpm db:migrate

# 4. اجرا
pnpm dev                # http://localhost:3000
```
