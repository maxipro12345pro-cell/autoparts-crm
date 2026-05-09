create table if not exists employees (
  id text primary key,
  full_name text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  normalized_phone text not null unique,
  email text,
  birth_date date,
  city text,
  comment text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists client_cars (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  brand text not null default '',
  model text not null default '',
  production_year text not null default '',
  vin_or_plate text not null default '',
  comment text not null default '',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum (
      'оформлен',
      'заказан',
      'в пути',
      'доставлен',
      'выдан клиенту',
      'отменён'
    );
  end if;
end $$;

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  car_id uuid references client_cars(id) on delete set null,
  product_name text not null,
  article text not null default '',
  brand text not null default '',
  quantity numeric(12, 2) not null check (quantity > 0),
  price numeric(12, 2) not null check (price > 0),
  total numeric(12, 2) not null check (total >= 0),
  status order_status not null default 'оформлен',
  employee_name text not null default 'Сотрудник',
  comment text not null default '',
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_type where typname = 'bonus_transaction_type') then
    create type bonus_transaction_type as enum (
      'auto_accrual',
      'manual_accrual',
      'manual_writeoff'
    );
  end if;
end $$;

create table if not exists bonus_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  type bonus_transaction_type not null,
  amount numeric(12, 2) not null,
  comment text not null default '',
  employee_name text not null default 'Сотрудник',
  created_at timestamptz not null default now()
);

create table if not exists loyalty_settings (
  id integer primary key default 1,
  bonus_percent numeric(5, 2) not null default 3,
  min_purchase_amount numeric(12, 2) not null default 0,
  max_redeem_percent numeric(5, 2) not null default 30,
  updated_at timestamptz not null default now(),
  constraint loyalty_settings_single_row check (id = 1)
);

insert into loyalty_settings (id)
values (1)
on conflict (id) do nothing;

create index if not exists client_cars_client_id_idx on client_cars(client_id);
create index if not exists orders_client_id_idx on orders(client_id);
create index if not exists orders_status_idx on orders(status);
create index if not exists bonus_transactions_client_id_idx on bonus_transactions(client_id);
create index if not exists bonus_transactions_order_id_idx on bonus_transactions(order_id);
