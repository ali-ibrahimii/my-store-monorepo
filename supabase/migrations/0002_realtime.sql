-- ============================================================
-- my-store — 0002: ریل‌تایم بین اسکنر (گوشی) و وب‌پنل
--
-- این فایل را یک‌بار در SQL Editor سوپابیس اجرا کنید (بعد از 0001_init.sql).
-- با اجرای این فایل:
--   • جدول‌های فاکتور و اسکن به «Realtime» سوپابیس اضافه می‌شوند
--   • ایندکس‌های لازم برای پولینگ سریع ساخته می‌شوند
--
-- بدون این فایل هم برنامه کار می‌کند، ولی همگام‌سازی لحظه‌ای از راه
-- پولینگ (هر ۳ ثانیه) انجام می‌شود، نه از راه WebSocket سوپابیس.
-- ============================================================

-- ------------------------------------------------------------
-- ۱) اضافه‌کردن جدول‌ها به publication ریل‌تایم
-- ------------------------------------------------------------
do $$
declare
  v_table text;
  v_tables text[] := array['invoices', 'invoice_items', 'payments', 'scan_events', 'products'];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'create publication supabase_realtime';
  end if;

  foreach v_table in array v_tables
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    exception
      when duplicate_object then null;   -- از قبل اضافه شده
      when undefined_table then null;    -- جدول وجود ندارد
    end;
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- ۲) عکس کامل ردیف در رویدادهای ریل‌تایم (برای UPDATE/DELETE)
-- ------------------------------------------------------------
alter table public.invoices replica identity full;
alter table public.invoice_items replica identity full;
alter table public.payments replica identity full;
alter table public.scan_events replica identity full;

-- ------------------------------------------------------------
-- ۳) ایندکس‌های سبک‌سازی «چه چیز تازه‌ای آمده؟»
--    (پولینگ فوری: فقط ردیف‌های تازه‌تر از آخرین بارِ دیده‌شده)
-- ------------------------------------------------------------
create index if not exists invoices_store_updated_idx
  on public.invoices (store_id, updated_at desc);

create index if not exists scan_store_created_id_idx
  on public.scan_events (store_id, created_at desc, id);

-- ------------------------------------------------------------
-- ۴) برچسب نوع اسکن «CART» (سبد فاکتور در حال تکمیل با گوشی)
--
-- نوع اسکن در جدول scan_events متن آزاد است و در 0001_init.sql
-- تابع record_scan برای نوع ناشناخته هیچ تغییری در موجودی نمی‌دهد؛
-- پس نیازی به تغییر اسکیما نیست. این تابع کمکی فقط برای خوانایی و
-- مصارف آینده اضافه می‌شود.
-- ------------------------------------------------------------
create or replace function public.scan_type_is_stock_neutral(p_type text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_type, '') in ('CART', 'COUNT');
$$;

grant execute on function public.scan_type_is_stock_neutral(text) to authenticated, service_role;

-- ------------------------------------------------------------
-- ۵) تابع تشخیص وضعیت نصب (برای صفحه‌ی /setup در وب‌اپ)
--
-- وب‌اپ با این تابع می‌فهمد کدام جدول‌ها ساخته نشده‌اند، ریل‌تایم
-- فعال است یا نه، و چند مدیر وجود دارد. فقط با کلید محرمانه‌ی سرور
-- قابل صدا زدن است.
-- ------------------------------------------------------------
create or replace function public.setup_diagnostics()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tables text[] := array[
    'stores', 'profiles', 'categories', 'products', 'customers',
    'invoices', 'invoice_items', 'payments', 'expense_categories', 'expenses',
    'purchases', 'purchase_items', 'ledger_entries', 'inventory_movements',
    'scan_events', 'counters'
  ];
  v_missing text[] := '{}';
  v_realtime text[] := '{}';
  v_table text;
  v_admins integer := -1;
begin
  foreach v_table in array v_tables
  loop
    if not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = v_table
    ) then
      v_missing := array_append(v_missing, v_table);
    end if;
  end loop;

  select coalesce(array_agg(distinct tablename), '{}')
    into v_realtime
    from pg_publication_tables
   where pubname = 'supabase_realtime'
     and tablename in ('invoices', 'invoice_items', 'scan_events');

  if not ('stores' = any (v_missing)) then
    begin
      select count(*) into v_admins from public.profiles where role = 'ADMIN' and active;
    exception when others then
      v_admins := -1;
    end;
  end if;

  return jsonb_build_object(
    'missingTables', to_jsonb(v_missing),
    'realtimeTables', to_jsonb(v_realtime),
    'adminCount', v_admins
  );
end;
$$;

revoke all on function public.setup_diagnostics() from public, anon, authenticated;
grant execute on function public.setup_diagnostics() to service_role;

-- ------------------------------------------------------------
-- تمام. برای بررسی:
--   select * from pg_publication_tables where pubname = 'supabase_realtime';
--   select public.setup_diagnostics();
-- ------------------------------------------------------------
