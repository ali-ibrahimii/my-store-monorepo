import { NextResponse } from "next/server";

import { createAccount } from "@/lib/accounts";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listStaff } from "@/lib/repositories";
import { staffSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const rows = await listStaff(user.storeId);
    return NextResponse.json(
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        active: row.active,
        createdAt: row.created_at,
      })),
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const parsed = staffSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }
    const account = await createAccount({
      email: parsed.data.email,
      password: parsed.data.password,
      name: parsed.data.name,
      role: "CASHIER",
      storeId: user.storeId,
    });
    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
