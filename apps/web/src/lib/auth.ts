import type { Role, SessionUser } from "@my-store/shared-types";
import { redirect } from "next/navigation";

import { assertData, createSupabaseServer, getAdmin, isSupabaseConfigured } from "@/lib/supabase";

interface ProfileRow {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  store_id: string;
  active: boolean;
}

export async function loadSessionUser(userId: string): Promise<SessionUser | null> {
  const result = await getAdmin()
    .from("profiles")
    .select("id, name, email, role, store_id, active")
    .eq("id", userId)
    .maybeSingle();
  const row = assertData(result) as ProfileRow | null;
  if (!row?.active) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    storeId: row.store_id,
  };
}

export async function userFromAccessToken(token: string): Promise<SessionUser | null> {
  const { data, error } = await getAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return loadSessionUser(data.user.id);
}

/** کاربر جاری از کوکی نشست سوپابیس. شکل خروجی با صفحه‌های قبلی سازگار است. */
export async function auth(): Promise<{ user: SessionUser } | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const user = await loadSessionUser(data.user.id);
  if (!user) return null;
  return { user };
}

export async function requirePageUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requirePageUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
