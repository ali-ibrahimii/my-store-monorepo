import { NextResponse } from "next/server";

import { rangeFromParams } from "@/lib/date-range";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listLedger } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { searchParams } = new URL(request.url);
    const range = rangeFromParams(searchParams.get("from"), searchParams.get("to"));
    const entries = await listLedger(user.storeId, {
      from: range.from,
      to: range.to,
      account: searchParams.get("account") || undefined,
    });
    return NextResponse.json(entries);
  } catch (error) {
    return handleRouteError(error);
  }
}
