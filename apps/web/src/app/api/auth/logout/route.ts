import { NextResponse } from "next/server";

import { createSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServer();
    await supabase.auth.signOut();
  }
  return NextResponse.json({ ok: true });
}
