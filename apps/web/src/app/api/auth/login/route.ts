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

/**
 * تفکیک خطاهای ورود.
 *
 * قبلاً هر خطایی از `signInWithPassword` — حتی «fetch failed» یا پروژه‌ی
 * Paused — به «ایمیل یا رمز عبور اشتباه است» (۴۰۱) تبدیل می‌شد؛ یعنی
 * کاربر رمز درست را هم عوض می‌کرد و مشکل حل نمی‌شد. حالا:
 *   • خطای شبکه/دسترسی   → ۵۰۳ با پیام واقعی (اسکنر همان را نشان می‌دهد)
 *   • ایمیل تأییدنشده    → ۴۰۳ با پیام «ایمیل تأیید نشده»
 *   • اعتبارنامه‌ی غلط    → ۴۰۱
 */
function authFailure(error: { message?: string; status?: number; code?: string } | null): {
  status: number;
  message: string;
} | null {
  const message = error?.message ?? "";
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|timeout|terminated/i.test(message)) {
    return {
      status: 503,
      message:
        "سرور احراز هویت در دسترس نیست. پروژه‌ی سوپابیس را در داشبورد بررسی کنید (نباید Paused باشد) و آدرس NEXT_PUBLIC_SUPABASE_URL را کنترل کنید.",
    };
  }
  if (/email not confirmed/i.test(message)) {
    return {
      status: 403,
      message:
        "ایمیل این حساب تأیید نشده است. در سوپابیس → Authentication → Providers → Email گزینه‌ی «Confirm email» را خاموش کنید.",
    };
  }
  if (/rate limit|too many/i.test(message)) {
    return { status: 429, message: "تلاش‌های ورود زیاد بوده است؛ چند دقیقه بعد دوباره امتحان کنید." };
  }
  return null;
}

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
      const mapped = authFailure(error);
      if (mapped) return jsonError(mapped.status, mapped.message);
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
