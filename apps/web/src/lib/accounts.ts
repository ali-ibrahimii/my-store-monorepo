import type { Role, SessionUser } from "@my-store/shared-types";
import { slugify } from "@my-store/shared-utils";

import { loadSessionUser } from "./auth";
import { assertData, dbErrorMessage, getAdmin } from "./supabase";

export async function createStore(input: {
  name: string;
  email?: string | null;
}): Promise<string> {
  const base = slugify(input.name, "store");
  let slug = base;
  for (let i = 0; i < 5; i++) {
    const existing = await getAdmin().from("stores").select("id").eq("slug", slug).maybeSingle();
    if (!existing.data) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const result = await getAdmin()
    .from("stores")
    .insert({
      name: input.name,
      slug,
      email: input.email || null,
      currency: "IRR",
      tax_rate: 0,
      invoice_prefix: "INV",
      low_stock_default: 5,
    })
    .select("id")
    .single();
  return (assertData(result) as { id: string }).id;
}

export async function createAccount(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  storeId: string;
}): Promise<SessionUser> {
  const email = input.email.toLowerCase().trim();
  const { data, error } = await getAdmin().auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role, store_id: input.storeId },
    user_metadata: { name: input.name },
  });
  if (error || !data.user) {
    throw new Error(dbErrorMessage(error, "ساخت حساب ممکن نشد"));
  }

  const profile = await getAdmin().from("profiles").insert({
    id: data.user.id,
    store_id: input.storeId,
    name: input.name,
    email,
    role: input.role,
    active: true,
  });
  if (profile.error) {
    await getAdmin().auth.admin.deleteUser(data.user.id);
    throw new Error(dbErrorMessage(profile.error, "ثبت پروفایل ممکن نشد"));
  }

  const user = await loadSessionUser(data.user.id);
  if (!user) throw new Error("پروفایل ساخته شد ولی خوانده نشد");
  return user;
}
