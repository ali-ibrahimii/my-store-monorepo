import { NextResponse } from "next/server";
import { z } from "zod";

import { loadSessionUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import { createSupabaseServer, isSupabaseConfigured, missingSupabaseMessage } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** POST /api/auth/login — ورود واقعی با سوپابیس و ست‌کردن کوکی نشست */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return jsonError(503, missingSupabaseMessage());
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(400, "ایمیل یا رمز عبور نامعتبر است");

    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase().trim(),
      password: parsed.data.password,
    });
    if (error || !data.user) {
      return jsonError(401, "ایمیل یا رمز عبور اشتباه است");
    }

    const user = await loadSessionUser(data.user.id);
    if (!user) {
      await supabase.auth.signOut();
      return jsonError(403, "این حساب غیرفعال است یا به فروشگاهی وصل نیست");
    }
    return NextResponse.json({ user });
  } catch (error) {
    return handleRouteError(error);
  }
}
