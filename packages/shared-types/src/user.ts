// ============================================================
// User & Auth types (shared between web, mobile and api-client)
// ============================================================

export const ROLES = ["OWNER", "ACCOUNTANT", "CASHIER"] as const;
export type Role = (typeof ROLES)[number];

export interface User {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  storeId: string;
  createdAt: string;
  updatedAt: string;
}

/** The user object attached to the session (next-auth). */
export interface SessionUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  storeId: string;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  currency: string;
  createdAt: string;
  updatedAt: string;
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
