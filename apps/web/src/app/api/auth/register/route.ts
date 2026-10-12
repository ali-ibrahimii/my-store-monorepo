import { NextResponse } from "next/server";

import { createAccount, createStore } from "@/lib/accounts";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { createSupabaseServer, getAdmin, isSupabaseConfigured, missingSupabaseMessage } from "@/lib/supabase";
import { registerSchema } from "@my-store/shared-utils";

export const dynamic = "force-dynamic";

/** POST /api/auth/register — ساخت فروشگاه + حساب مدیر در سوپابیس */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return jsonError(503, missingSupabaseMessage());
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر است");
    }

    const email = parsed.data.email.toLowerCase().trim();
    const taken = await getAdmin().from("profiles").select("id").eq("email", email).maybeSingle();
    if (taken.data) return jsonError(409, "این ایمیل قبلاً ثبت شده است");

    const storeId = await createStore({ name: parsed.data.storeName, email });
    try {
      await createAccount({
        email,
        password: parsed.data.password,
        name: parsed.data.name,
        role: "ADMIN",
        storeId,
      });
    } catch (error) {
      await getAdmin().from("stores").delete().eq("id", storeId);
      throw error;
    }

    const supabase = await createSupabaseServer();
    const signed = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (signed.error) {
      return jsonError(201, "فروشگاه ساخته شد؛ لطفاً از صفحه ورود وارد شوید");
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
