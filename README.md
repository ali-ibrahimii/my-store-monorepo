# My Store — مونورپو

یک سیستم مدیریت فروشگاه کوچک (نقطه‌فروش + انبار + حسابداری دوبل + اسکنر بارکد)
به‌صورت یک **مونورپوی pnpm + turbo**.

- **وب‌اپ:** Next.js 16 (App Router) + React 19 + NextAuth v5 + Tailwind 4
- **دیتابیس:** **MongoDB** با درایور رسمی `mongodb` (بدون ORM، بدون مرحله‌ی generate)
- **موبایل:** اسکلت Expo (هنوز به دیتابیس وصل نیست)
- **رابط کاربری:** فارسی و راست‌به‌چپ

> **می‌خواهی MongoDB را یاد بگیری؟**
> [`docs/MONGODB-BE-ZABAN-SADE.md`](docs/MONGODB-BE-ZABAN-SADE.md) — توضیح کامل و ساده،
> همراه با نگارش در این پروژه و مقایسه‌ی SQL ↔ MongoDB.

---

## اجرای سریع (۳ دستور)

```bash
pnpm install

pnpm db:sandbox    # ترمینال ۱ — دیتابیس توسعه روی 127.0.0.1:27017 (داده در حافظه)
pnpm dev           # ترمینال ۲ — وب‌اپ روی http://localhost:3000
```

`pnpm dev` به‌صورت خودکار داده‌ی نمونه را می‌ریزد (فقط اگر دیتابیس خالی باشد).

**حساب‌های نمونه:**

| ایمیل | رمز | نقش |
|---|---|---|
| `owner@mystore.ir` | `123456` | OWNER — دسترسی کامل |
| `cashier@mystore.ir` | `123456` | CASHIER — فقط صندوق |

بارکدهای نمونه (برای تست `/scan`): `6281111000019` شیر کم‌چرب · `6281111000026` آب معدنی ·
`6281111000033` نوشابه · `6281111000040` برنج · `6281111000057` چای · `6281111000064` شکر ·
`6281111000071` بیسکوییت · `6281111000088` روغن

---

## دستورها

| دستور | کار |
|---|---|
| `pnpm dev` | اجرای همه‌ی اپ‌ها با turbo |
| `pnpm build` | بیلد پروداکشن |
| `pnpm lint` / `pnpm type-check` | ESLint / TypeScript |
| `pnpm db:sandbox` | سرور MongoDB-سازگارِ توسعه (در حافظه، بدون نصب) |
| `pnpm db:seed` | ریختن داده‌ی نمونه |
| `pnpm db:reset` | پاک‌کردن دیتابیس و ریختن دوباره‌ی نمونه |
| `pnpm docker:up` / `pnpm docker:down` | MongoDB واقعی (replica set) + mongo-express + Redis |

---

## انتخاب دیتابیس

سه حالت پشتیبانی می‌شود؛ کد برنامه برای همه‌ی آن‌ها **یکی** است.

### ۱) سرور توسعه‌ی داخل ریپو (پیش‌فرض)

```bash
pnpm db:sandbox
```

`tooling/dev-db` یک سرور سازگار با پروتکل MongoDB بالا می‌آورد
(`@rckflr/easydb-server` با adapter حافظه). هیچ نصب اضافه‌ای لازم نیست.

محدودیت‌هایش (که در کد لحاظ شده‌اند): تراکنش پشتیبانی نمی‌شود →
`runInTransaction()` به نوشتن متوالی برمی‌گردد؛ ایندکس `unique` enforce نمی‌شود →
یکتایی بارکد در کد چک می‌شود؛ `$facet` کار نمی‌کند → در `stats.ts` استفاده نشده.
داده‌ی آن در حافظه است و با خاموش‌شدن پاک می‌شود.

### ۲) Docker (MongoDB واقعی، با تراکنش)

```bash
pnpm docker:up
pnpm db:seed
pnpm dev
```

`mongo:7` به‌صورت **replica set تک‌گره** بالا می‌آید (چون MongoDB فقط روی replica set
از تراکنش چندداکیومنتی پشتیبانی می‌کند)، به‌همراه:

- رابط گرافیکی mongo-express روی <http://localhost:8081>
- Redis روی `6379` (اختیاری؛ برای صف رویدادهای Realtime)

### ۳) MongoDB Atlas (ابری، برای استقرار)

یک کلاستر رایگان M0 بساز، IP خودت را whitelist کن و `MONGODB_URI` را تنظیم کن.

---

## پیکربندی محیطی

```bash
cp apps/web/.env.example apps/web/.env.local
```

| متغیر | لازم | توضیح |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb://127.0.0.1:27017/mystore?directConnection=true` |
| `MONGODB_DB` | ✅ | نام دیتابیس، مثلاً `mystore` |
| `AUTH_SECRET` | ✅ | رشته‌ی تصادفی بلند برای امضای session |
| `AUTH_TRUST_HOST` | ✅ | `true` برای توسعه |
| `MONGODB_TRANSACTIONS` | — | `auto` (پیش‌فرض) / `on` / `off` |
| `MONGODB_MAX_POOL_SIZE` | — | اندازه‌ی pool اتصال (پیش‌فرض ۱۰) |
| `MONGODB_SERVER_SELECTION_TIMEOUT_MS` | — | مهلت یافتن سرور (پیش‌فرض ۵۰۰۰) |
| `REDIS_URL` | — | فقط در صورت استفاده از صف Realtime |

---

## ساختار مونورپو

```
apps/
  web/            # Next.js 16 — وب‌اپ اصلی (صفحه‌ها + API routes)
  mobile/         # Expo — اسکلت اپ موبایل
packages/
  shared-types/   # تایپ‌های مشترک (DTOها، نقش‌ها، وضعیت فاکتور، …)
  shared-utils/   # توابع کمکی (formatMoney، slugify، …)
  ui-kit/         # کامپوننت‌های UI (Button, Card, Input, Badge)
  api-client/     # کلاینت تایپ‌دارِ API برای موبایل/کلاینت‌های دیگر
tooling/
  dev-db/         # سرور MongoDB-سازگار برای توسعه
docs/
```

### لایه‌ی داده (همه در `apps/web/src/lib/`)

| فایل | مسئولیت |
|---|---|
| `db.ts` | اتصال، هلپرهای `oid()`، ساخت ایندکس‌ها، `runInTransaction()` |
| `models.ts` | شکل سند‌ها در TypeScript |
| `repositories.ts` | خواندن/نوشتن + وصل‌کردن روابط بین سند‌ها |
| `serialize.ts` | تبدیل سند خام → DTO تمیز |
| `stats.ts` | همه‌ی aggregateها و ریاضی گزارش‌ها (API و صفحه‌ها از همین استفاده می‌کنند) |
| `ledger.ts` | سند‌های حسابداری بدهکار/بستانکار |
| `invoice-service.ts` | صدور فاکتور، پرداخت، لغو، اثر روی موجودی و بدهی مشتری |
| `scan-service.ts` | پردازش رویداد اسکن بارکد |
| `auth.ts` | NextAuth با provider اعتبارنامه‌ای و نقش‌ها |

### صفحه‌ها

| مسیر | محتوا |
|---|---|
| `/` | صفحه‌ی ورودی |
| `/login` · `/register` | ورود و ثبت‌نام فروشگاه جدید |
| `/dashboard` | آمار امروز/ماه، ارزش انبار، کم‌موجودی‌ها |
| `/products` | CRUD محصولات و دسته‌بندی‌ها |
| `/customers` | CRUD مشتریان و مانده‌حساب |
| `/accounting` | لیست فاکتورها + ساخت فاکتور |
| `/accounting/invoices/[id]` | جزئیات فاکتور، ثبت پرداخت، تغییر وضعیت/لغو |
| `/accounting/expenses` | هزینه‌ها و دسته‌بندی هزینه |
| `/accounting/reports` | سود و زیان، گردش حساب، گزارش فروش |
| `/scan` | اسکنر بارکد (دوربین) + ورود/خروج کالا و فید زنده |

### API

`GET/POST/PATCH/DELETE` روی:
`/api/products`، `/api/products/[id]`، `/api/products/lookup`، `/api/categories`،
`/api/customers`، `/api/invoices`، `/api/invoices/[id]`، `/api/invoices/[id]/payments`،
`/api/expenses`، `/api/expense-categories`، `/api/scan`، `/api/scan/stream` (SSE)،
`/api/reports/{summary,profit-loss,sales}`، `/api/auth/register`.

**قراردادها:**

- پاسخ موفق = خودِ DTO (یا یک `Page` با `items` و `total` و `page` و `pageSize`)؛
  پاسخ خطا = `{ "error": "پیام فارسی" }`.
- `id`ها در JSON **رشته‌ی هگز ۲۴ کاراکتری** هستند (نه `ObjectId`).
- **چندفروشگاهی:** هر کوئری با `storeId` محدود می‌شود؛ نقش‌ها `OWNER` / `ACCOUNTANT` / `CASHIER`.
- خطاهای اعتبارسنجی `400`، تداخل یکتایی `409`، بدون نشست `401`، بدون دسترسی `403`.
- ورودی‌ها با **zod** اعتبارسنجی می‌شوند.

---

## منطق کسب‌وکار

- **صدور فاکتور:** کاهش موجودی، ثبت حرکت انبار، ثبت سند حسابداری
  (بدهکار صندوق + بدهکار حساب دریافتنی / بستانکار درآمد فروش / بدهکار بهای تمام‌شده + بستانکار انبار)،
  به‌روزرسانی مانده‌حساب مشتری.
- **پرداخت جزئی** → وضعیت `PARTIAL` و مانده‌ی بدهی؛ **تسویه** → `PAID`.
- **لغو فاکتور** → بازگشت موجودی، برگشت سند حسابداری، صفرشدن اثر روی مانده‌حساب مشتری.
- **اسکن بارکد:** `SALE` / `COUNT` / `CHECK_IN` (ورود کالا، افزایش موجودی) /
  `CHECK_OUT` (خروج، کاهش) / `ADJUSTMENT`.
  بارکد ناشناخته هم ذخیره می‌شود (با `productId: null`) تا بعداً به محصول وصل شود.
- **دفتر کل** همیشه باید متوازن باشد: مجموع بدهکار == مجموع بستانکار.

---

## بررسی سلامت

```bash
pnpm type-check   # باید ۰ خطا بدهد
pnpm lint         # باید ۰ مشکل بدهد
pnpm build        # بیلد پروداکشن
```

---

## نکات توسعه

- Next.js 16 تفاوت‌هایی با نسخه‌های قبلی دارد. اگر شک کردی، مستندات داخل
  `node_modules/next/dist/docs/` را بخوان.
- `packages/*` به‌صورت **سورس TypeScript** مصرف می‌شوند (با `transpilePackages`)؛
  نیازی به بیلد جدا ندارند.
- فایل `.env.local` در گیت نادیده گرفته می‌شود؛ فقط `.env.example` ثبت می‌شود.
- برای ریست کامل داده‌ی توسعه: `pnpm db:reset`.
