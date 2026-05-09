alter table public.orders
add column if not exists car_id uuid references public.client_cars(id) on delete set null,
add column if not exists article text not null default '',
add column if not exists brand text not null default '',
add column if not exists quantity numeric(12, 2) not null default 1,
add column if not exists price numeric(12, 2) not null default 1,
add column if not exists total numeric(12, 2) not null default 0,
add column if not exists employee_name text not null default 'Сотрудник',
add column if not exists comment text not null default '';

create index if not exists orders_client_id_idx on public.orders(client_id);
create index if not exists orders_status_idx on public.orders(status);

notify pgrst, 'reload schema';
