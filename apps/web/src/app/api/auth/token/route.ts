import { NextResponse } from "next/server";
import { z } from "zod";

import { loadSessionUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/api-helpers";
import {
  createAnonClient,
  isSupabaseConfigured,
  missingSupabaseMessage,
} from "@/lib/supabase";
import type { ScannerSession } from "@my-store/shared-types";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** POST /api/auth/token — ورود اپ اسکنر؛ توکن دسترسی سوپابیس برمی‌گرداند */
export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) return jsonError(503, missingSupabaseMessage());
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) return jsonError(400, "ایمیل یا رمز عبور نامعتبر است");

    const supabase = createAnonClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email.toLowerCase().trim(),
      password: parsed.data.password,
    });
    if (error || !data.session || !data.user) {
      return jsonError(401, "ایمیل یا رمز عبور اشتباه است");
    }

    const user = await loadSessionUser(data.user.id);
    if (!user) return jsonError(403, "این حساب غیرفعال است");

    const session: ScannerSession = {
      token: data.session.access_token,
      user,
      expiresAt: new Date((data.session.expires_at ?? 0) * 1000).toISOString(),
    };
    return NextResponse.json(session);
  } catch (error) {
    return handleRouteError(error);
  }
}
