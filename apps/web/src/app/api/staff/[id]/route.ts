import { NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError, jsonError, requireStoreUser } from "@/lib/api-helpers";
import { getAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { user, response } = await requireStoreUser("ADMIN");
    if (!user) return response;
    const { id } = await context.params;
    if (id === user.id) return jsonError(400, "نمی‌توانید حساب خودتان را غیرفعال کنید");

    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return jsonError(400, "اطلاعات نامعتبر است");

    const updated = await getAdmin()
      .from("profiles")
      .update({ active: parsed.data.active, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("store_id", user.storeId)
      .eq("role", "CASHIER")
      .select("id")
      .maybeSingle();
    if (updated.error) return jsonError(400, updated.error.message);
    if (!updated.data) return jsonError(404, "صندوق‌دار یافت نشد");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
