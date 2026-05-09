alter table public.client_bonus_balances enable row level security;

grant select, insert, update, delete
on table public.client_bonus_balances
to anon, authenticated;

drop policy if exists "prototype client bonus balances access"
on public.client_bonus_balances;

create policy "prototype client bonus balances access"
on public.client_bonus_balances
for all
to anon, authenticated
using (true)
with check (true);

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'client_bonus_balances';
