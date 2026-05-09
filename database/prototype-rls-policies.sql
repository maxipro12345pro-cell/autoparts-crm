alter table clients enable row level security;
alter table client_cars enable row level security;
alter table orders enable row level security;
alter table bonus_transactions enable row level security;
alter table loyalty_settings enable row level security;

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
