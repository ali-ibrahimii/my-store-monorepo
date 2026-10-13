export const ROLES = ["ADMIN", "CASHIER"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  storeId: string;
  active?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  storeId: string;
  /** نام فروشگاه — در همان کوئری پروفایل می‌آید (اختیاری) */
  storeName?: string | null;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  currency: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  /** درصد مالیات پیش‌فرض، مثلاً ۹ */
  taxRate: number;
  invoicePrefix: string;
  receiptFooter: string | null;
  lowStockDefault: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStoreInput {
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  currency?: string;
  taxRate?: number;
  invoicePrefix?: string;
  receiptFooter?: string;
  lowStockDefault?: number;
}

export interface RegisterInput {
  storeName: string;
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** نشست اپ اسکنر — توکن سوپابیس، نه کوکی. */
export interface ScannerSession {
  token: string;
  user: SessionUser;
  expiresAt: string;
}

/** @deprecated نام قدیمی اپ موبایل؛ همان ScannerSession است. */
export type MobileSession = ScannerSession;

export interface StaffMember {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password: string;
}
