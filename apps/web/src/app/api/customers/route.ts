import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { customerDTO, pageDTO } from "@/lib/serialize";
import { customerSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/customers?search= */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const search = new URL(request.url).searchParams.get("search")?.trim();
    const customers = await prisma.customer.findMany({
      where: {
        storeId: user.storeId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(pageDTO(customers.map(customerDTO), customers.length, 1, 100));
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

    const customer = await prisma.customer.create({
      data: {
        storeId: user.storeId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
      },
    });

    return NextResponse.json(customerDTO(customer), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
