import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

/** GET /api/auth/session — کاربر جاری (کوکی وب یا توکن اسکنر) */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
