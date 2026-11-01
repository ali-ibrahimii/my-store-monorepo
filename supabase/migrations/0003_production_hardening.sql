-- ============================================================
-- 0003_production_hardening.sql
--
-- ۱) پیش‌فرض ارز → افغانی (AFN)
-- ۲) جلوگیری از سوءاستفاده‌ی «ثبت سریع کالا» توسط صندوق‌دار
--    (هر حساب حداکثر N کالا در ۲۴ ساعت؛ صندوق‌دار دیگر نمی‌تواند کالای
--    بی‌حساب بسازد تا موجودی/گزارش‌ها را دست‌کاری کند)
--
-- این فایل را بعد از 0001 و 0002 در SQL Editor اجرا کنید. تکرارپذیر است.
-- ============================================================

-- ------------------------------------------------------------
-- ۱) ارز پیش‌فرض
-- ------------------------------------------------------------
alter table public.stores
  alter column currency set default 'AFN';

-- فروشگاه‌هایی که هنوز روی ارز پیش‌فرض قدیمی مانده‌اند و هیچ داده‌ای ندارند
-- لازم نیست عوض شوند؛ ولی پیش‌فرض برای فروشگاه جدید AFN است.

-- ------------------------------------------------------------
-- ۲) محدودیت ثبت کالای جدید توسط صندوق‌دار
-- ------------------------------------------------------------
-- محصولات هیچ ستون «سازنده» نداشتند؛ برای کنترل لازم است.
alter table public.products
  add column if not exists created_by uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_created_by_fkey'
  ) then
    alter table public.products
      add constraint products_created_by_fkey
      foreign key (created_by) references public.profiles (id) on delete set null;
  end if;
end;
$$;

create index if not exists products_store_created_by_idx
  on public.products (store_id, created_by, created_at desc);

-- سیاست: صندوق‌دار روزی حداکثر ۵۰ کالای تازه ثبت کند.
-- (مدیر محدودیتی ندارد.) این عدد از تنظیمات فروشگاه هم قابل خواندن است،
-- ولی برای سادگی در یک تابع ثابت نگه داشته شده.
create or replace function public.assert_product_creation_allowed(p_store uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_count integer;
  v_limit integer := 50;
begin
  if p_user is null then
    return;
  end if;

  select role into v_role from public.profiles where id = p_user and store_id = p_store;
  if v_role is null then
    raise exception 'کاربر برای این فروشگاه یافت نشد';
  end if;
  if v_role = 'ADMIN' then
    return;
  end if;

  select count(*) into v_count
    from public.products
   where store_id = p_store
     and created_by = p_user
     and created_at > now() - interval '24 hours';

  if v_count >= v_limit then
    raise exception 'سهمیه‌ی ثبت کالای جدید امروز تمام شد (%). لطفاً مدیر کالا را ثبت کند.', v_limit;
  end if;
end;
$$;

revoke all on function public.assert_product_creation_allowed(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assert_product_creation_allowed(uuid, uuid) to service_role;

-- ------------------------------------------------------------
-- ۳) ایندکس برای گزارش‌های زمانی (سریع‌تر شدن داشبورد/گزارش‌ها)
-- ------------------------------------------------------------
create index if not exists expenses_store_created_idx
  on public.expenses (store_id, date desc);

create index if not exists ledger_store_account_date_idx
  on public.ledger_entries (store_id, account, date desc);
