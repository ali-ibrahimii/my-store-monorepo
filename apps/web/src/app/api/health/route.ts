import { isSupabaseConfigured, pingDatabase, supabaseUrl } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();
  const result = await pingDatabase();
  const host = supabaseUrl().replace(/^https?:\/\//, "").split(".")[0] || null;

  const body = {
    ok: result.ok,
    app: "my-store",
    db: "supabase",
    project: host,
    configured: isSupabaseConfigured(),
    database: result.ok
      ? { reachable: true }
      : {
          reachable: false,
          error: result.error,
          hint: isSupabaseConfigured()
            ? "اسکیما را از supabase/migrations/0001_init.sql در SQL Editor سوپابیس اجرا کنید، بعد pnpm db:seed."
            : "apps/web/.env.local را با NEXT_PUBLIC_SUPABASE_URL، کلید publishable و کلید محرمانه‌ی سرور پر کنید.",
        },
    latencyMs: Date.now() - started,
    time: new Date().toISOString(),
  };

  return Response.json(body, { status: result.ok ? 200 : 503 });
}
