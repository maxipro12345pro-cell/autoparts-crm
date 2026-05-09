alter table public.bonus_transactions
add column if not exists order_id uuid references public.orders(id) on delete set null,
add column if not exists type bonus_transaction_type not null default 'manual_accrual',
add column if not exists amount numeric(12, 2) not null default 0,
add column if not exists comment text not null default '',
add column if not exists employee_name text not null default 'Сотрудник';

create index if not exists bonus_transactions_client_id_idx
on public.bonus_transactions(client_id);

create index if not exists bonus_transactions_order_id_idx
on public.bonus_transactions(order_id);

notify pgrst, 'reload schema';
