alter table clients
add column if not exists normalized_phone text;

update clients
set normalized_phone = regexp_replace(phone, '[^0-9+]', '', 'g')
where normalized_phone is null or normalized_phone = '';

alter table clients
alter column normalized_phone set not null;

create unique index if not exists clients_normalized_phone_key
on clients(normalized_phone);

alter table clients
add column if not exists birth_date date,
add column if not exists notes text;

alter table client_cars
add column if not exists vin_or_plate text not null default '',
add column if not exists production_year text not null default '';

alter table loyalty_settings
alter column id type integer using 1,
alter column id set default 1;

alter table loyalty_settings
drop constraint if exists loyalty_settings_single_row;

alter table loyalty_settings
add constraint loyalty_settings_single_row check (id = 1);

insert into loyalty_settings (id)
values (1)
on conflict (id) do nothing;
