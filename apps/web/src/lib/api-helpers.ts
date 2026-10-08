import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasRole } from "@my-store/shared-utils";
import type { Role, SessionUser } from "@my-store/shared-types";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function handleRouteError(error: unknown) {
  console.error("[api] route error:", error);
  if (error instanceof Error) {
    return jsonError(400, error.message);
  }
  return jsonError(500, "خطای داخلی سرور");
}

/**
 * Resolve the current session user (with role + storeId).
 * Returns `{ user: null, response }` when unauthenticated/forbidden.
 */
export async function requireStoreUser(minRole?: Role) {
  const session = await auth();
  const raw = session?.user;
  if (!raw?.id || !raw.storeId) {
    return {
      user: null,
      response: jsonError(401, "لطفاً وارد حساب کاربری شوید"),
    } as const;
  }

  const user: SessionUser = {
    id: raw.id,
    email: raw.email ?? "",
    name: raw.name ?? null,
    role: (raw.role as Role) ?? "CASHIER",
    storeId: raw.storeId,
  };

  if (minRole && !hasRole(user.role, minRole)) {
    return {
      user: null,
      response: jsonError(403, "شما اجازه انجام این操作 را ندارید"),
    } as const;
  }

  return { user, response: null } as const;
}
