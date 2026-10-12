-- ============================================================
-- my-store — اسکیمای سوپابیس (Postgres + Auth + RLS)
--
-- در داشبورد سوپابیس: SQL Editor → این فایل را کامل اجرا کنید.
-- بعد apps/web/.env.local را پر کنید و `pnpm db:seed` بزنید.
--
-- نقش‌ها: ADMIN (مدیر) و CASHIER (صندوق‌دار)
-- نوشتن‌های حساس (فاکتور، پرداخت، اسکن، هزینه، خرید) تابع
-- تراکنشی هستند و فقط با service_role از سرور صدا زده می‌شوند.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- جداول
-- ------------------------------------------------------------

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  currency text not null default 'IRR',
  phone text,
  address text,
  email text,
  tax_rate numeric(8, 2) not null default 0,
  invoice_prefix text not null default 'INV',
  receipt_footer text,
  low_stock_default integer not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  name text,
  email text not null,
  role text not null check (role in ('ADMIN', 'CASHIER')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_email_key on public.profiles (lower(email));
create index if not exists profiles_store_idx on public.profiles (store_id);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text,
  barcode text not null default '',
  description text,
  cost_price numeric(18, 2) not null default 0,
  sale_price numeric(18, 2) not null default 0,
  stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  is_low_stock boolean generated always as (stock <= low_stock_threshold) stored,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists products_store_barcode_key
  on public.products (store_id, barcode)
  where barcode <> '';
create index if not exists products_store_name_idx on public.products (store_id, name);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  phone text,
  address text,
  note text,
  balance numeric(18, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_store_name_idx on public.customers (store_id, name);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  number text not null,
  status text not null check (status in ('DRAFT', 'ISSUED', 'PAID', 'PARTIAL', 'CANCELLED')),
  customer_id uuid references public.customers (id) on delete set null,
  subtotal numeric(18, 2) not null default 0,
  discount numeric(18, 2) not null default 0,
  tax numeric(18, 2) not null default 0,
  total numeric(18, 2) not null default 0,
  paid_amount numeric(18, 2) not null default 0,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number)
);

create index if not exists invoices_store_created_idx on public.invoices (store_id, created_at desc);
create index if not exists invoices_store_status_idx on public.invoices (store_id, status);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty integer not null check (qty > 0),
  unit_price numeric(18, 2) not null check (unit_price >= 0),
  total numeric(18, 2) not null
);

create index if not exists invoice_items_invoice_idx on public.invoice_items (invoice_id);
create index if not exists invoice_items_product_idx on public.invoice_items (product_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  method text not null check (method in ('CASH', 'CARD', 'TRANSFER', 'CREDIT')),
  amount numeric(18, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists payments_store_created_idx on public.payments (store_id, created_at desc);

create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null,
  unique (store_id, name)
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  title text not null,
  amount numeric(18, 2) not null check (amount > 0),
  date timestamptz not null default now(),
  note text,
  receipt_url text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists expenses_store_date_idx on public.expenses (store_id, date desc);

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  number text not null,
  supplier text,
  total numeric(18, 2) not null default 0,
  paid_amount numeric(18, 2) not null default 0,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, number)
);

create table if not exists public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete cascade,
  product_id uuid not null references public.products (id),
  qty integer not null check (qty > 0),
  unit_cost numeric(18, 2) not null check (unit_cost >= 0),
  total numeric(18, 2) not null
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  date timestamptz not null default now(),
  account text not null,
  type text not null check (type in ('DEBIT', 'CREDIT')),
  amount numeric(18, 2) not null check (amount >= 0),
  ref_type text,
  ref_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ledger_store_date_idx on public.ledger_entries (store_id, date desc);
create index if not exists ledger_ref_idx on public.ledger_entries (ref_id);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid not null references public.products (id),
  type text not null,
  qty integer not null,
  ref_type text,
  ref_id uuid,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists movements_store_created_idx
  on public.inventory_movements (store_id, created_at desc);

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  barcode text not null,
  type text not null,
  qty integer not null default 1,
  device text,
  note text,
  user_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists scan_store_created_idx on public.scan_events (store_id, created_at desc);

alter table public.scan_events
  drop constraint if exists scan_events_user_id_fkey;
alter table public.scan_events
  add constraint scan_events_user_id_fkey
  foreign key (user_id) references public.profiles (id) on delete set null;

create table if not exists public.counters (
  store_id uuid not null references public.stores (id) on delete cascade,
  kind text not null,
  seq integer not null default 0,
  primary key (store_id, kind)
);

-- ------------------------------------------------------------
-- updated_at
-- ------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stores_touch on public.stores;
create trigger stores_touch before update on public.stores
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists categories_touch on public.categories;
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();

drop trigger if exists invoices_touch on public.invoices;
create trigger invoices_touch before update on public.invoices
  for each row execute function public.touch_updated_at();

drop trigger if exists purchases_touch on public.purchases;
create trigger purchases_touch before update on public.purchases
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- کمک‌تابع‌های نشست (برای RLS)
-- ------------------------------------------------------------

create or replace function public.current_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select store_id from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true
$$;

create or replace function public.next_doc_number(p_store_id uuid, p_kind text, p_prefix text)
returns text
language plpgsql
as $$
declare
  v_seq integer;
begin
  insert into public.counters as c (store_id, kind, seq)
  values (p_store_id, p_kind, 1)
  on conflict (store_id, kind)
  do update set seq = c.seq + 1
  returning seq into v_seq;
  return p_prefix || '-' || lpad(v_seq::text, 4, '0');
end;
$$;

create or replace function public.post_ledger(p_store uuid, p_entries jsonb, p_date timestamptz default now())
returns void
language plpgsql
as $$
declare
  v_debit numeric := 0;
  v_credit numeric := 0;
  v_entry jsonb;
  v_amount numeric;
begin
  if p_entries is null or jsonb_typeof(p_entries) <> 'array' or jsonb_array_length(p_entries) = 0 then
    return;
  end if;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_amount := coalesce((v_entry->>'amount')::numeric, 0);
    if v_amount <= 0 then
      continue;
    end if;
    if (v_entry->>'type') = 'DEBIT' then
      v_debit := v_debit + v_amount;
    else
      v_credit := v_credit + v_amount;
    end if;
  end loop;

  if abs(v_debit - v_credit) > 0.01 then
    raise exception 'اسناد دفتر کل متوازن نیست';
  end if;

  insert into public.ledger_entries (store_id, date, account, type, amount, ref_type, ref_id, note)
  select
    p_store,
    coalesce(p_date, now()),
    e->>'account',
    e->>'type',
    (e->>'amount')::numeric,
    nullif(e->>'ref_type', ''),
    nullif(e->>'ref_id', '')::uuid,
    nullif(e->>'note', '')
  from jsonb_array_elements(p_entries) e
  where coalesce((e->>'amount')::numeric, 0) > 0;
end;
$$;

-- ------------------------------------------------------------
-- فاکتور فروش (اتمی)
-- ------------------------------------------------------------

create or replace function public.create_invoice(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_user uuid := nullif(payload->>'created_by', '')::uuid;
  v_customer uuid := nullif(payload->>'customer_id', '')::uuid;
  v_discount numeric := greatest(coalesce((payload->>'discount')::numeric, 0), 0);
  v_tax numeric := greatest(coalesce((payload->>'tax')::numeric, 0), 0);
  v_note text := nullif(payload->>'note', '');
  v_issue boolean := coalesce((payload->>'issue_now')::boolean, true);
  v_payment jsonb := payload->'payment';
  v_item jsonb;
  v_product public.products%rowtype;
  v_seen jsonb := '{}'::jsonb;
  v_pid uuid;
  v_qty integer;
  v_price numeric;
  v_already integer;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_paid numeric := 0;
  v_pay numeric := 0;
  v_cogs numeric := 0;
  v_status text;
  v_number text;
  v_id uuid := gen_random_uuid();
  v_prefix text;
  v_unpaid numeric;
  v_now timestamptz := now();
  v_entries jsonb := '[]'::jsonb;
begin
  if v_store is null then
    raise exception 'فروشگاه نامعتبر است';
  end if;

  select invoice_prefix into v_prefix from public.stores where id = v_store;
  if v_prefix is null then
    raise exception 'فروشگاه یافت نشد';
  end if;

  if payload->'items' is null or jsonb_typeof(payload->'items') <> 'array' or jsonb_array_length(payload->'items') = 0 then
    raise exception 'حداقل یک آیتم لازم است';
  end if;

  if v_customer is not null and not exists (
    select 1 from public.customers where id = v_customer and store_id = v_store
  ) then
    raise exception 'مشتری یافت نشد';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_pid := nullif(v_item->>'product_id', '')::uuid;
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    v_price := coalesce((v_item->>'unit_price')::numeric, 0);
    if v_pid is null or v_qty <= 0 or v_price < 0 then
      raise exception 'آیتم فاکتور نامعتبر است';
    end if;

    select * into v_product from public.products
      where id = v_pid and store_id = v_store
      for update;
    if not found then
      raise exception 'یکی از محصولات یافت نشد';
    end if;

    v_already := coalesce((v_seen->>v_pid::text)::integer, 0);
    if v_issue and v_product.stock < v_already + v_qty then
      raise exception 'موجودی «%» کافی نیست (موجودی: %)', v_product.name, v_product.stock;
    end if;
    v_seen := jsonb_set(v_seen, array[v_pid::text], to_jsonb(v_already + v_qty));
    v_subtotal := v_subtotal + (v_qty * v_price);
    v_cogs := v_cogs + (v_qty * v_product.cost_price);
  end loop;

  v_total := greatest(0, v_subtotal - v_discount + v_tax);

  if v_issue and v_payment is not null and jsonb_typeof(v_payment) = 'object' then
    v_pay := least(greatest(coalesce((v_payment->>'amount')::numeric, 0), 0), v_total);
    v_paid := v_pay;
  end if;

  v_status := case
    when not v_issue then 'DRAFT'
    when v_paid >= v_total then 'PAID'
    when v_paid > 0 then 'PARTIAL'
    else 'ISSUED'
  end;

  v_number := public.next_doc_number(v_store, 'invoice', coalesce(nullif(v_prefix, ''), 'INV'));

  insert into public.invoices (
    id, store_id, number, status, customer_id, subtotal, discount, tax, total,
    paid_amount, note, created_by, issued_at, created_at, updated_at
  ) values (
    v_id, v_store, v_number, v_status, v_customer, v_subtotal, v_discount, v_tax, v_total,
    v_paid, v_note, v_user, case when v_issue then v_now else null end, v_now, v_now
  );

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    v_price := (v_item->>'unit_price')::numeric;

    insert into public.invoice_items (invoice_id, product_id, qty, unit_price, total)
    values (v_id, v_pid, v_qty, v_price, v_qty * v_price);

    if v_issue then
      update public.products
        set stock = stock - v_qty, updated_at = v_now
        where id = v_pid;
      insert into public.inventory_movements (store_id, product_id, type, qty, ref_type, ref_id, note)
      values (v_store, v_pid, 'SALE', -v_qty, 'invoice', v_id, 'فاکتور ' || v_number);
    end if;
  end loop;

  if v_pay > 0 then
    insert into public.payments (invoice_id, store_id, method, amount, note)
    values (
      v_id,
      v_store,
      coalesce(nullif(v_payment->>'method', ''), 'CASH'),
      v_pay,
      nullif(v_payment->>'note', '')
    );
  end if;

  v_unpaid := greatest(0, v_total - v_paid);
  if v_issue and v_customer is not null and v_unpaid > 0 then
    update public.customers
      set balance = balance + v_unpaid, updated_at = v_now
      where id = v_customer;
  end if;

  if v_issue and v_total > 0 then
    if v_paid > 0 then
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account', 'CASH_BANK', 'type', 'DEBIT', 'amount', v_paid,
        'ref_type', 'invoice', 'ref_id', v_id, 'note', 'فاکتور ' || v_number
      ));
    end if;
    if v_unpaid > 0 then
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account', 'ACCOUNTS_RECEIVABLE', 'type', 'DEBIT', 'amount', v_unpaid,
        'ref_type', 'invoice', 'ref_id', v_id, 'note', 'فاکتور ' || v_number
      ));
    end if;
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account', 'SALES_REVENUE', 'type', 'CREDIT', 'amount', v_total,
      'ref_type', 'invoice', 'ref_id', v_id, 'note', 'فاکتور ' || v_number
    ));
  end if;

  if v_issue and v_cogs > 0 then
    v_entries := v_entries || jsonb_build_array(
      jsonb_build_object(
        'account', 'COGS', 'type', 'DEBIT', 'amount', v_cogs,
        'ref_type', 'invoice', 'ref_id', v_id, 'note', 'فاکتور ' || v_number
      ),
      jsonb_build_object(
        'account', 'INVENTORY', 'type', 'CREDIT', 'amount', v_cogs,
        'ref_type', 'invoice', 'ref_id', v_id, 'note', 'فاکتور ' || v_number
      )
    );
  end if;

  perform public.post_ledger(v_store, v_entries, v_now);
  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.add_invoice_payment(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_invoice uuid := (payload->>'invoice_id')::uuid;
  v_amount numeric := coalesce((payload->>'amount')::numeric, 0);
  v_method text := coalesce(nullif(payload->>'method', ''), 'CASH');
  v_note text := nullif(payload->>'note', '');
  v_row public.invoices%rowtype;
  v_remaining numeric;
  v_now timestamptz := now();
begin
  select * into v_row from public.invoices
    where id = v_invoice and store_id = v_store
    for update;
  if not found then
    raise exception 'فاکتور یافت نشد';
  end if;
  if v_row.status in ('CANCELLED', 'DRAFT') then
    raise exception 'روی این فاکتور نمی‌توان پرداخت ثبت کرد';
  end if;

  v_remaining := v_row.total - v_row.paid_amount;
  if v_amount <= 0 then
    raise exception 'مبلغ پرداخت باید بیشتر از صفر باشد';
  end if;
  if v_amount > v_remaining + 0.01 then
    raise exception 'مبلغ پرداخت بیشتر از بدهی باقیمانده است (باقیمانده: %)', v_remaining;
  end if;
  v_amount := least(v_amount, v_remaining);

  insert into public.payments (invoice_id, store_id, method, amount, note)
  values (v_invoice, v_store, v_method, v_amount, v_note);

  update public.invoices
    set paid_amount = paid_amount + v_amount,
        status = case
          when paid_amount + v_amount >= total then 'PAID'
          else 'PARTIAL'
        end,
        updated_at = v_now
    where id = v_invoice;

  if v_row.customer_id is not null then
    update public.customers
      set balance = balance - v_amount, updated_at = v_now
      where id = v_row.customer_id;
  end if;

  perform public.post_ledger(v_store, jsonb_build_array(
    jsonb_build_object('account', 'CASH_BANK', 'type', 'DEBIT', 'amount', v_amount, 'ref_type', 'payment', 'ref_id', v_invoice, 'note', 'پرداخت فاکتور ' || v_row.number),
    jsonb_build_object('account', 'ACCOUNTS_RECEIVABLE', 'type', 'CREDIT', 'amount', v_amount, 'ref_type', 'payment', 'ref_id', v_invoice, 'note', 'پرداخت فاکتور ' || v_row.number)
  ), v_now);

  return jsonb_build_object('id', v_invoice);
end;
$$;

create or replace function public.set_invoice_status(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_invoice uuid := (payload->>'invoice_id')::uuid;
  v_status text := payload->>'status';
  v_row public.invoices%rowtype;
  v_item record;
  v_product public.products%rowtype;
  v_unpaid numeric;
  v_cogs numeric := 0;
  v_now timestamptz := now();
  v_entries jsonb := '[]'::jsonb;
  v_ledger public.ledger_entries%rowtype;
begin
  select * into v_row from public.invoices
    where id = v_invoice and store_id = v_store
    for update;
  if not found then
    raise exception 'فاکتور یافت نشد';
  end if;
  if v_row.status = v_status then
    return jsonb_build_object('id', v_invoice);
  end if;

  if v_status = 'CANCELLED' then
    if v_row.status <> 'DRAFT' then
      for v_item in
        select * from public.invoice_items where invoice_id = v_invoice
      loop
        update public.products
          set stock = stock + v_item.qty, updated_at = v_now
          where id = v_item.product_id;
        insert into public.inventory_movements (store_id, product_id, type, qty, ref_type, ref_id, note)
        values (v_store, v_item.product_id, 'ADJUSTMENT', v_item.qty, 'invoice', v_invoice, 'لغو فاکتور ' || v_row.number);
      end loop;

      v_unpaid := greatest(0, v_row.total - v_row.paid_amount);
      if v_row.customer_id is not null and v_unpaid > 0 then
        update public.customers
          set balance = balance - v_unpaid, updated_at = v_now
          where id = v_row.customer_id;
      end if;

      for v_ledger in
        select * from public.ledger_entries
        where store_id = v_store and ref_id = v_invoice and coalesce(ref_type, '') <> 'reversal'
      loop
        insert into public.ledger_entries (store_id, date, account, type, amount, ref_type, ref_id, note)
        values (
          v_store, v_now, v_ledger.account,
          case when v_ledger.type = 'DEBIT' then 'CREDIT' else 'DEBIT' end,
          v_ledger.amount, 'reversal', v_invoice, 'لغو فاکتور ' || v_row.number
        );
      end loop;
    end if;

    update public.invoices set status = 'CANCELLED', updated_at = v_now where id = v_invoice;
    return jsonb_build_object('id', v_invoice);
  end if;

  if v_row.status = 'DRAFT' and v_status in ('ISSUED', 'PARTIAL', 'PAID') then
    for v_item in select * from public.invoice_items where invoice_id = v_invoice
    loop
      select * into v_product from public.products where id = v_item.product_id for update;
      if v_product.stock < v_item.qty then
        raise exception 'موجودی «%» کافی نیست (موجودی: %)', v_product.name, v_product.stock;
      end if;
      v_cogs := v_cogs + (v_item.qty * v_product.cost_price);
      update public.products set stock = stock - v_item.qty, updated_at = v_now where id = v_item.product_id;
      insert into public.inventory_movements (store_id, product_id, type, qty, ref_type, ref_id, note)
      values (v_store, v_item.product_id, 'SALE', -v_item.qty, 'invoice', v_invoice, 'فاکتور ' || v_row.number);
    end loop;

    v_unpaid := greatest(0, v_row.total - v_row.paid_amount);
    if v_row.customer_id is not null and v_unpaid > 0 then
      update public.customers set balance = balance + v_unpaid, updated_at = v_now where id = v_row.customer_id;
    end if;

    if v_row.total > 0 then
      if v_row.paid_amount > 0 then
        v_entries := v_entries || jsonb_build_array(jsonb_build_object(
          'account', 'CASH_BANK', 'type', 'DEBIT', 'amount', v_row.paid_amount,
          'ref_type', 'invoice', 'ref_id', v_invoice, 'note', 'فاکتور ' || v_row.number
        ));
      end if;
      if v_unpaid > 0 then
        v_entries := v_entries || jsonb_build_array(jsonb_build_object(
          'account', 'ACCOUNTS_RECEIVABLE', 'type', 'DEBIT', 'amount', v_unpaid,
          'ref_type', 'invoice', 'ref_id', v_invoice, 'note', 'فاکتور ' || v_row.number
        ));
      end if;
      v_entries := v_entries || jsonb_build_array(jsonb_build_object(
        'account', 'SALES_REVENUE', 'type', 'CREDIT', 'amount', v_row.total,
        'ref_type', 'invoice', 'ref_id', v_invoice, 'note', 'فاکتور ' || v_row.number
      ));
    end if;
    if v_cogs > 0 then
      v_entries := v_entries || jsonb_build_array(
        jsonb_build_object('account', 'COGS', 'type', 'DEBIT', 'amount', v_cogs, 'ref_type', 'invoice', 'ref_id', v_invoice, 'note', 'فاکتور ' || v_row.number),
        jsonb_build_object('account', 'INVENTORY', 'type', 'CREDIT', 'amount', v_cogs, 'ref_type', 'invoice', 'ref_id', v_invoice, 'note', 'فاکتور ' || v_row.number)
      );
    end if;
    perform public.post_ledger(v_store, v_entries, v_now);

    update public.invoices
      set status = case
            when v_row.paid_amount >= v_row.total then 'PAID'
            when v_row.paid_amount > 0 then 'PARTIAL'
            else 'ISSUED'
          end,
          issued_at = coalesce(issued_at, v_now),
          updated_at = v_now
      where id = v_invoice;
    return jsonb_build_object('id', v_invoice);
  end if;

  raise exception 'تغییر وضعیت از % به % مجاز نیست', v_row.status, v_status;
end;
$$;

-- ------------------------------------------------------------
-- اسکن
-- ------------------------------------------------------------

create or replace function public.record_scan(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_user uuid := nullif(payload->>'user_id', '')::uuid;
  v_barcode text := payload->>'barcode';
  v_type text := coalesce(nullif(payload->>'type', ''), 'CHECK_IN');
  v_qty integer := greatest(coalesce((payload->>'qty')::integer, 1), 1);
  v_product public.products%rowtype;
  v_delta integer := 0;
  v_id uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_stock integer;
  v_name text;
begin
  if v_barcode is null or length(v_barcode) < 4 then
    raise exception 'بارکد نامعتبر است';
  end if;

  select * into v_product from public.products
    where store_id = v_store and barcode = v_barcode
    for update;

  if found then
    if v_type = 'CHECK_IN' then
      v_delta := v_qty;
    elsif v_type in ('CHECK_OUT', 'SALE') then
      v_delta := -v_qty;
    elsif v_type = 'ADJUSTMENT' then
      v_delta := v_qty;
    end if;

    if v_delta < 0 and v_product.stock + v_delta < 0 then
      raise exception 'موجودی «%» کافی نیست (موجودی: %)', v_product.name, v_product.stock;
    end if;
  end if;

  insert into public.scan_events (id, store_id, product_id, barcode, type, qty, device, note, user_id, created_at)
  values (
    v_id, v_store,
    case when found then v_product.id else null end,
    v_barcode, v_type, v_qty,
    nullif(payload->>'device', ''),
    nullif(payload->>'note', ''),
    v_user, v_now
  );

  v_stock := coalesce(v_product.stock, 0);
  if found and v_delta <> 0 then
    update public.products set stock = stock + v_delta, updated_at = v_now where id = v_product.id;
    insert into public.inventory_movements (store_id, product_id, type, qty, ref_type, ref_id, note)
    values (
      v_store, v_product.id,
      case
        when v_type = 'CHECK_IN' then 'SCAN_IN'
        when v_type = 'SALE' then 'SALE'
        else 'ADJUSTMENT'
      end,
      v_delta, 'scan', v_id, 'اسکن ' || v_type
    );
    v_stock := v_product.stock + v_delta;
  end if;

  select name into v_name from public.profiles where id = v_user;

  return jsonb_build_object(
    'id', v_id,
    'product_id', case when found then v_product.id else null end,
    'barcode', v_barcode,
    'type', v_type,
    'qty', v_qty,
    'device', nullif(payload->>'device', ''),
    'note', nullif(payload->>'note', ''),
    'user_id', v_user,
    'user_name', v_name,
    'store_id', v_store,
    'created_at', v_now,
    'product_name', case when found then v_product.name else null end,
    'sale_price', case when found then v_product.sale_price else null end,
    'stock', case when found then v_stock else null end
  );
end;
$$;

-- ------------------------------------------------------------
-- هزینه و خرید
-- ------------------------------------------------------------

create or replace function public.create_expense(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_id uuid := gen_random_uuid();
  v_amount numeric := coalesce((payload->>'amount')::numeric, 0);
  v_title text := nullif(payload->>'title', '');
  v_date timestamptz := coalesce(nullif(payload->>'date', '')::timestamptz, now());
  v_category uuid := nullif(payload->>'category_id', '')::uuid;
begin
  if v_title is null or v_amount <= 0 then
    raise exception 'عنوان و مبلغ هزینه لازم است';
  end if;
  if v_category is not null and not exists (
    select 1 from public.expense_categories where id = v_category and store_id = v_store
  ) then
    raise exception 'دسته‌ی هزینه یافت نشد';
  end if;

  insert into public.expenses (id, store_id, category_id, title, amount, date, note, created_by)
  values (
    v_id, v_store, v_category, v_title, v_amount, v_date,
    nullif(payload->>'note', ''),
    nullif(payload->>'created_by', '')::uuid
  );

  perform public.post_ledger(v_store, jsonb_build_array(
    jsonb_build_object('account', 'EXPENSE', 'type', 'DEBIT', 'amount', v_amount, 'ref_type', 'expense', 'ref_id', v_id, 'note', v_title),
    jsonb_build_object('account', 'CASH_BANK', 'type', 'CREDIT', 'amount', v_amount, 'ref_type', 'expense', 'ref_id', v_id, 'note', v_title)
  ), v_date);

  return jsonb_build_object('id', v_id);
end;
$$;

create or replace function public.create_purchase(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store uuid := (payload->>'store_id')::uuid;
  v_user uuid := nullif(payload->>'created_by', '')::uuid;
  v_id uuid := gen_random_uuid();
  v_item jsonb;
  v_product public.products%rowtype;
  v_pid uuid;
  v_qty integer;
  v_cost numeric;
  v_total numeric := 0;
  v_paid numeric := greatest(coalesce((payload->>'paid_amount')::numeric, 0), 0);
  v_number text;
  v_prefix text;
  v_new_cost numeric;
  v_now timestamptz := now();
  v_unpaid numeric;
  v_entries jsonb := '[]'::jsonb;
begin
  select coalesce(nullif(invoice_prefix, ''), 'INV') into v_prefix from public.stores where id = v_store;
  if v_prefix is null then
    raise exception 'فروشگاه یافت نشد';
  end if;
  if payload->'items' is null or jsonb_array_length(payload->'items') = 0 then
    raise exception 'حداقل یک قلم خرید لازم است';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    v_cost := coalesce((v_item->>'unit_cost')::numeric, 0);
    if v_qty <= 0 or v_cost < 0 then
      raise exception 'قلم خرید نامعتبر است';
    end if;
    v_total := v_total + (v_qty * v_cost);
  end loop;

  if v_paid > v_total then
    v_paid := v_total;
  end if;

  v_number := public.next_doc_number(v_store, 'purchase', 'PUR');

  insert into public.purchases (id, store_id, number, supplier, total, paid_amount, note, created_by)
  values (
    v_id, v_store, v_number,
    nullif(payload->>'supplier', ''),
    v_total, v_paid,
    nullif(payload->>'note', ''),
    v_user
  );

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'qty')::integer;
    v_cost := (v_item->>'unit_cost')::numeric;
    select * into v_product from public.products where id = v_pid and store_id = v_store for update;
    if not found then
      raise exception 'یکی از محصولات یافت نشد';
    end if;

    if v_product.stock + v_qty = 0 then
      v_new_cost := v_cost;
    else
      v_new_cost := ((v_product.stock * v_product.cost_price) + (v_qty * v_cost)) / (v_product.stock + v_qty);
    end if;

    update public.products
      set stock = stock + v_qty, cost_price = v_new_cost, updated_at = v_now
      where id = v_pid;

    insert into public.purchase_items (purchase_id, product_id, qty, unit_cost, total)
    values (v_id, v_pid, v_qty, v_cost, v_qty * v_cost);

    insert into public.inventory_movements (store_id, product_id, type, qty, ref_type, ref_id, note)
    values (v_store, v_pid, 'PURCHASE', v_qty, 'purchase', v_id, 'خرید ' || v_number);
  end loop;

  v_unpaid := greatest(0, v_total - v_paid);
  v_entries := jsonb_build_array(jsonb_build_object(
    'account', 'INVENTORY', 'type', 'DEBIT', 'amount', v_total,
    'ref_type', 'purchase', 'ref_id', v_id, 'note', 'خرید ' || v_number
  ));
  if v_paid > 0 then
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account', 'CASH_BANK', 'type', 'CREDIT', 'amount', v_paid,
      'ref_type', 'purchase', 'ref_id', v_id, 'note', 'خرید ' || v_number
    ));
  end if;
  if v_unpaid > 0 then
    v_entries := v_entries || jsonb_build_array(jsonb_build_object(
      'account', 'ACCOUNTS_PAYABLE', 'type', 'CREDIT', 'amount', v_unpaid,
      'ref_type', 'purchase', 'ref_id', v_id, 'note', 'خرید ' || v_number
    ));
  end if;
  perform public.post_ledger(v_store, v_entries, v_now);

  return jsonb_build_object('id', v_id, 'number', v_number);
end;
$$;

-- ------------------------------------------------------------
-- دسترسی تابع‌ها: فقط service_role
-- ------------------------------------------------------------

revoke all on function public.next_doc_number(uuid, text, text) from public, anon, authenticated;
revoke all on function public.post_ledger(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.create_invoice(jsonb) from public, anon, authenticated;
revoke all on function public.add_invoice_payment(jsonb) from public, anon, authenticated;
revoke all on function public.set_invoice_status(jsonb) from public, anon, authenticated;
revoke all on function public.record_scan(jsonb) from public, anon, authenticated;
revoke all on function public.create_expense(jsonb) from public, anon, authenticated;
revoke all on function public.create_purchase(jsonb) from public, anon, authenticated;

grant execute on function public.current_store_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
grant execute on function public.create_invoice(jsonb) to service_role;
grant execute on function public.add_invoice_payment(jsonb) to service_role;
grant execute on function public.set_invoice_status(jsonb) to service_role;
grant execute on function public.record_scan(jsonb) to service_role;
grant execute on function public.create_expense(jsonb) to service_role;
grant execute on function public.create_purchase(jsonb) to service_role;
grant execute on function public.next_doc_number(uuid, text, text) to service_role;
grant execute on function public.post_ledger(uuid, jsonb, timestamptz) to service_role;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.stores enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.scan_events enable row level security;
alter table public.counters enable row level security;

drop policy if exists stores_member_read on public.stores;
create policy stores_member_read on public.stores
  for select to authenticated
  using (id = public.current_store_id());

drop policy if exists stores_admin_update on public.stores;
create policy stores_admin_update on public.stores
  for update to authenticated
  using (id = public.current_store_id() and public.current_user_role() = 'ADMIN')
  with check (id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select to authenticated
  using (store_id = public.current_store_id());

drop policy if exists store_read on public.categories;
create policy store_read on public.categories
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists store_admin_write on public.categories;
create policy store_admin_write on public.categories
  for all to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN')
  with check (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN')
  with check (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers
  for insert to authenticated
  with check (store_id = public.current_store_id());

drop policy if exists customers_admin_update on public.customers;
create policy customers_admin_update on public.customers
  for update to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN')
  with check (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists customers_admin_delete on public.customers;
create policy customers_admin_delete on public.customers
  for delete to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists invoice_items_read on public.invoice_items;
create policy invoice_items_read on public.invoice_items
  for select to authenticated
  using (exists (
    select 1 from public.invoices i
    where i.id = invoice_id and i.store_id = public.current_store_id()
  ));

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists expenses_read on public.expenses;
create policy expenses_read on public.expenses
  for select to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists expense_categories_read on public.expense_categories;
create policy expense_categories_read on public.expense_categories
  for select to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists purchases_read on public.purchases;
create policy purchases_read on public.purchases
  for select to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists purchase_items_read on public.purchase_items;
create policy purchase_items_read on public.purchase_items
  for select to authenticated
  using (exists (
    select 1 from public.purchases p
    where p.id = purchase_id and p.store_id = public.current_store_id()
  ) and public.current_user_role() = 'ADMIN');

drop policy if exists ledger_read on public.ledger_entries;
create policy ledger_read on public.ledger_entries
  for select to authenticated
  using (store_id = public.current_store_id() and public.current_user_role() = 'ADMIN');

drop policy if exists movements_read on public.inventory_movements;
create policy movements_read on public.inventory_movements
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists scans_read on public.scan_events;
create policy scans_read on public.scan_events
  for select to authenticated using (store_id = public.current_store_id());

drop policy if exists scans_insert on public.scan_events;
create policy scans_insert on public.scan_events
  for insert to authenticated
  with check (store_id = public.current_store_id());
