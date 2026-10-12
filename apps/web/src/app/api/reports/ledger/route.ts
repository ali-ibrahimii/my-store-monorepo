import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listLedger } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const entries = await listLedger(user.storeId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to + "T23:59:59.999Z") : undefined,
      account: searchParams.get("account") || undefined,
    });
    return NextResponse.json(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}
