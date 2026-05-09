alter table public.loyalty_settings
alter column id type integer using 1,
alter column id set default 1;

alter table public.loyalty_settings
add column if not exists bonus_percent numeric(5, 2) not null default 3,
add column if not exists min_purchase_amount numeric(12, 2) not null default 0,
add column if not exists max_redeem_percent numeric(5, 2) not null default 30,
add column if not exists updated_at timestamptz not null default now();

alter table public.loyalty_settings
drop constraint if exists loyalty_settings_single_row;

alter table public.loyalty_settings
add constraint loyalty_settings_single_row check (id = 1);

insert into public.loyalty_settings (id)
values (1)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
