import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { collections } from "@/lib/db";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { listCustomers } from "@/lib/repositories";
import { customerDTO, pageDTO } from "@/lib/serialize";
import { customerSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/customers?search= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const search = new URL(request.url).searchParams.get("search")?.trim() || undefined;
    const customers = await listCustomers(user.storeId, search);
    return NextResponse.json(pageDTO(customers, customers.length, 1, 100));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/customers */
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

    const { customers } = await collections();
    const now = new Date();
    const _id = new ObjectId();

    await customers.insertOne({
      _id,
      storeId: user.storeId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    });

    const doc = await customers.findOne({ _id });
    return NextResponse.json(customerDTO(doc!), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
