import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRouteError, requireStoreUser } from "@/lib/api-helpers";
import { pageDTO } from "@/lib/serialize";
import { recordScan } from "@/lib/scan-service";
import { scanInputSchema } from "@my-store/shared-utils";
import type { ScanEvent } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

function eventDTO(e: {
  id: string;
  productId: string | null;
  barcode: string;
  type: string;
  qty: number;
  device: string | null;
  note: string | null;
  userId: string | null;
  user?: { name: string | null; email: string } | null;
  storeId: string;
  createdAt: Date;
  product?: {
    id: string;
    name: string;
    barcode: string;
    salePrice: unknown;
    stock: number;
  } | null;
}): ScanEvent {
  return {
    id: e.id,
    productId: e.productId,
    barcode: e.barcode,
    type: e.type as ScanEvent["type"],
    qty: e.qty,
    device: e.device,
    note: e.note,
    userId: e.userId,
    userName: e.user?.name ?? e.user?.email ?? null,
    storeId: e.storeId,
    createdAt: e.createdAt.toISOString(),
    product: e.product
      ? {
          id: e.product.id,
          name: e.product.name,
          barcode: e.product.barcode,
          salePrice: Number(e.product.salePrice),
          stock: e.product.stock,
        }
      : null,
  };
}

/** GET /api/scan — recent scan events (initial state for the live feed) */
export async function GET(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 30));

    const where = { storeId: user.storeId };
    const [total, items] = await Promise.all([
      prisma.scanEvent.count({ where }),
      prisma.scanEvent.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, barcode: true, salePrice: true, stock: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(pageDTO(items.map(eventDTO), total, page, pageSize));
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * POST /api/scan — record a scan.
 * Persists immediately and broadcasts in real-time to all connected clients.
 */
export async function POST(request: Request) {
  try {
    const { user, response } = await requireStoreUser();
    if (!user) return response;

    const body = await request.json();
    const parsed = scanInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است" },
        { status: 400 },
      );
    }

    const event = await recordScan(parsed.data, user.id, user.storeId);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
