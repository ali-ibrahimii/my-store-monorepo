import { NextResponse } from "next/server";

import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listCustomers } from "@/lib/repositories";
import { customerDTO, pageDTO, type CustomerRow } from "@/lib/serialize";
import { assertData, getAdmin } from "@/lib/supabase";
import { customerSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;
    const search = new URL(request.url).searchParams.get("search")?.trim() || undefined;
    const customers = await listCustomers(user.storeId, search);
    return NextResponse.json(pageDTO(customers, customers.length, 1, 500));
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = customerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const inserted = await getAdmin()
      .from("customers")
      .insert({
        store_id: user.storeId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        note: parsed.data.note || null,
        balance: 0,
      })
      .select("*")
      .single();
    return NextResponse.json(customerDTO(assertData(inserted) as CustomerRow), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
