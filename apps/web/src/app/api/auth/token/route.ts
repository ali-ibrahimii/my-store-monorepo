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

/** همان تفکیک خطای مسیر ورود وب — پیام گمراه‌کننده‌ی «رمز اشتباه» حذف شد. */
function authFailure(error: { message?: string } | null): { status: number; message: string } | null {
  const message = error?.message ?? "";
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|timeout|terminated/i.test(message)) {
    return {
      status: 503,
      message:
        "سرور احراز هویت در دسترس نیست. وضعیت پروژه‌ی سوپابیس (Paused؟) و NEXT_PUBLIC_SUPABASE_URL را بررسی کنید.",
    };
  }
  if (/email not confirmed/i.test(message)) {
    return {
      status: 403,
      message:
        "ایمیل این حساب تأیید نشده است. در سوپابیس «Confirm email» را خاموش کنید یا کاربر را با ایمیل تأییدشده بسازید.",
    };
  }
  if (/rate limit|too many/i.test(message)) {
    return { status: 429, message: "تلاش‌های ورود زیاد بوده است؛ چند دقیقه بعد دوباره امتحان کنید." };
  }
  return null;
}

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
      const mapped = authFailure(error);
      if (mapped) return jsonError(mapped.status, mapped.message);
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
