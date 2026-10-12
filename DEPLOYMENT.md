# استقرار روی Vercel — راهنمای کامل

این پروژه **دو اپ جدا** دارد که هر کدام به‌صورت یک پروژه‌ی مستقل روی Vercel
deploy می‌شوند:

| اپ | مسیر | خروجی | مثال |
|---|---|---|---|
| **وب‌اپ (داشبورد + API)** | `apps/web` | Next.js | `https://mystore.vercel.app` — روی لب‌تاپ باز می‌شود |
| **اپ اسکنر (موبایل)** | `apps/scanner` | Vite (PWA) | `https://scan-mystore.vercel.app` — روی گوشی اندروید باز می‌شود |

جریان کار: گوشی بارکد را اسکن می‌کند → `POST /api/scan` روی وب‌اپ →
رویداد بلافاصله در «فید زنده اسکن‌ها» در داشبورد لب‌تاپ ظاهر می‌شود
(SSE + پولینگ پشتیبان ۱۵ ثانیه‌ای).

---

## ۱) دیتابیس — MongoDB Atlas (رایگان)

Vercel دیتابیس ندارد؛ از Atlas استفاده کنید:

1. در [cloud.mongodb.com](https://cloud.mongodb.com) ثبت‌نام کنید.
2. یک کلاستر رایگان **M0** بسازید (هر ریجونی، مثلاً Frankfurt).
3. در **Database Access** یک کاربر با رمز بسازید.
4. در **Network Access** آی‌پی `0.0.0.0/0` را مجاز کنید (Vercel آی‌پی ثابت ندارد).
5. از **Connect → Drivers** رشته‌ی اتصال را کپی کنید:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/mystore
   ```

## ۲) پروژه‌ی اول — وب‌اپ (داشبورد + API)

1. در [vercel.com/new](https://vercel.com/new) ریپوی GitHub را import کنید.
2. در تنظیمات، **Root Directory** را `apps/web` بگذارید.
3. Framework خودکار Next.js تشخیص داده می‌شود.
4. متغیرهای محیطی (Environment Variables):

   | نام | مقدار |
   |---|---|
   | `MONGODB_URI` | رشته‌ی اتصال Atlas (مرحله‌ی ۱) |
   | `AUTH_SECRET` | یک رمز تصادفی بلند — مثلاً خروج `openssl rand -base64 32` |
   | `AUTH_TRUST_HOST` | `true` |
   | `CORS_ORIGINS` | آدرس اپ اسکنر، مثلاً `https://scan-mystore.vercel.app` (چند آدرس با کاما) |
   | `REDIS_URL` | *(اختیاری)* Redis برای همگام‌سازی لحظه‌ای بین چند instance —见 پایین |

5. **Deploy** را بزنید. آدرس نهایی (مثلاً `mystore.vercel.app`) را نگه دارید.

### ریختن داده‌ی نمونه (یک‌بار)

روی کامپیوتر خودتان، با رشته‌ی اتصال Atlas:

```bash
MONGODB_URI="mongodb+srv://..." pnpm db:seed
```

۱۸ محصول با بارکد، ۵ دسته‌بندی، ۵ مشتری، فاکتور و هزینه‌ی نمونه ساخته
می‌شود. ورود: `owner@mystore.ir / 123456` (مالک) یا
`cashier@mystore.ir / 123456` (صندوق‌دار).

(جای seed می‌توانید از صفحه‌ی «ثبت‌نام» هم فروشگاه خودتان را بسازید.)

## ۳) پروژه‌ی دوم — اپ اسکنر (گوشی)

1. دوباره **Add New → Project** و همان ریپو را import کنید.
2. **Root Directory** را `apps/scanner` بگذارید (Framework: Vite، Output: `dist`).
3. متغیر محیطی:

   | نام | مقدار |
   |---|---|
   | `VITE_API_URL` | آدرس وب‌اپ مرحله‌ی ۲ — مثلاً `https://mystore.vercel.app` |

   ⚠️ متغیرهای `VITE_*` **زمان build** داخل کد درج می‌شوند؛ اول این را ست
   کنید بعد Deploy بزنید (اگر عوضش کردید، Redeploy لازم است).

4. **Deploy** → آدرسی مثل `https://scan-mystore.vercel.app` می‌گیرید.
5. اگر در مرحله‌ی ۲ `CORS_ORIGINS` را ست کرده‌اید، همین آدرس را آنجا هم
   وارد کنید و وب‌اپ را Redeploy کنید.

## ۴) استفاده

- **لب‌تاپ:** `https://mystore.vercel.app` → ورود → داشبورد.
  کارت «فید زنده اسکن‌ها» هر اسکن گوشی را لحظه‌ای نشان می‌دهد.
- **گوشی اندروید:** `https://scan-mystore.vercel.app` را در Chrome باز کنید
  → ورود → «شروع اسکن با دوربین» → اجازه‌ی دوربین را بدهید.
  برای نصب مثل اپ واقعی: منوی Chrome ← **Add to Home screen / نصب برنامه**.
  (دوربین فقط روی HTTPS کار می‌کند — آدرس Vercel خودش HTTPS است.)

---

## نکته‌ی real-time روی Vercel

پخش لحظه‌ای با SSE انجام می‌شود. روی Vercel عمر هر connection محدود است و
EventSource خودکار وصل می‌شود مجدد؛ علاوه بر آن داشبورد هر ۱۵ ثانیه
پولینگ پشتیبان دارد، بنابراین **هیچ اسکنی از قلم نمی‌افتد**.

اگر می‌خواهید پخش آنی بین چند instance سرورلس هم تضمین شود، یک Redis
رایگان از [Upstash](https://upstash.com) بسازید و `REDIS_URL` را در وب‌اپ ست
کنید — کد از قبل پشتیبانی می‌کند (pub/sub در `lib/realtime.ts`).

## اجرای محلی (توسعه)

```bash
pnpm install
pnpm dev:web       # داشبورد + API روی http://localhost:3000
pnpm dev:scanner   # اپ اسکنر روی http://localhost:5173 (پروکسی /api → :3000)
```

در توسعه نیازی به CORS و `VITE_API_URL` نیست — پروکسی Vite درخواست‌های
`/api` را هم‌ریشه به وب‌اپ می‌فرستد.
