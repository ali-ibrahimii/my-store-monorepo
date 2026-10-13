/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** آدرس وب‌اپ/API — مثلاً https://my-store-monorepo.vercel.app (خالی = همان دامنه) */
  readonly VITE_API_URL?: string;
  /** آدرس عمومی وب‌اپ برای لینک‌های چاپ/پنل (اختیاری، پیش‌فرض همان VITE_API_URL) */
  readonly VITE_WEB_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare const __API_ORIGIN__: string;
