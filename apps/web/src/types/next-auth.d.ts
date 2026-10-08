import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      storeId: string;
    } & DefaultSession["user"];
  }

  interface User {
    role?: string;
    storeId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    storeId?: string;
  }
}

// next-auth v5 re-exports the JWT type from @auth/core — augment both so the
// token is typed everywhere (callbacks use the @auth/core one).
declare module "@auth/core/jwt" {
  interface JWT {
    role?: string;
    storeId?: string;
  }
}
