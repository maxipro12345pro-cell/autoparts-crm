alter table clients enable row level security;
alter table client_cars enable row level security;
alter table orders enable row level security;
alter table bonus_transactions enable row level security;
alter table loyalty_settings enable row level security;
alter table if exists client_bonus_balances enable row level security;

drop policy if exists "prototype clients access" on clients;
create policy "prototype clients access"
on clients
for all
to anon
using (true)
with check (true);

drop policy if exists "prototype client cars access" on client_cars;
create policy "prototype client cars access"
on client_cars
for all
to anon
using (true)
with check (true);

drop policy if exists "prototype orders access" on orders;
create policy "prototype orders access"
on orders
for all
to anon
using (true)
with check (true);

drop policy if exists "prototype bonus transactions access" on bonus_transactions;
create policy "prototype bonus transactions access"
on bonus_transactions
for all
to anon
using (true)
with check (true);

drop policy if exists "prototype loyalty settings access" on loyalty_settings;
create policy "prototype loyalty settings access"
on loyalty_settings
for all
to anon
using (true)
with check (true);

do $$
begin
  if to_regclass('public.client_bonus_balances') is not null then
    execute 'grant select, insert, update, delete on table public.client_bonus_balances to anon, authenticated';
    execute 'drop policy if exists "prototype client bonus balances access" on client_bonus_balances';
    execute 'create policy "prototype client bonus balances access"
      on client_bonus_balances
      for all
      to anon, authenticated
      using (true)
      with check (true)';
  end if;
end $$;
