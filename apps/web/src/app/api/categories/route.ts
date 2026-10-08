import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { categoryDTO } from "@/lib/serialize";
import { categorySchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** GET /api/categories */
export async function GET() {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const categories = await prisma.category.findMany({
      where: { storeId: user.storeId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories.map(categoryDTO));
  } catch (error) {
    return handleRouteError(error);
  }
}

/** POST /api/categories */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const slug =
      parsed.data.slug ||
      parsed.data.name
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .slice(0, 40);

    const category = await prisma.category.create({
      data: { storeId: user.storeId, name: parsed.data.name, slug },
    });
    return NextResponse.json(categoryDTO(category), { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
