/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** آدرس وب‌اپ/API — مثلاً https://mystore.vercel.app (خالی = همان دامنه) */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
