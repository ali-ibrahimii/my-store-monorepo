# استقرار

وب و اسکنر جدا deploy می‌شوند. دیتابیس فقط سوپابیس است؛ MongoDB و Redis لازم نیست.

## وب (Vercel)

1. ریشه مونورپو را وصل کنید و Root Directory را `apps/web` بگذارید، یا از ریشه با فیلتر `web` بیلد بگیرید.
2. متغیرها:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (یا نام قدیمی `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SECRET_KEY` (یا نام قدیمی `SUPABASE_SERVICE_ROLE_KEY`؛ فقط سرور)
- `NEXT_PUBLIC_APP_URL` آدرس عمومی وب
- `CORS_ORIGINS` آدرس اپ اسکنر، اگر جدا است

3. اسکیما را یک‌بار در SQL Editor سوپابیس اجرا کنید (`supabase/migrations/0001_init.sql`).
4. `pnpm db:seed` را محلی با همان کلیدها بزنید، یا از صفحه ثبت‌نام حساب مدیر بسازید و صندوق‌دار را از صفحه کاربران اضافه کنید.

## اسکنر

Root Directory: `apps/scanner`

- `VITE_API_URL` = آدرس وب، مثلاً `https://app.example.com`
- در وب، `CORS_ORIGINS` را همان دامنه اسکنر بگذارید.

ورود اسکنر `POST /api/auth/token` است و توکن دسترسی سوپابیس برمی‌گرداند.
