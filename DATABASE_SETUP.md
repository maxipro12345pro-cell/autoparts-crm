# Подключение общей базы данных

CRM пока работает в режиме `localStorage`, чтобы текущий прототип не ломался.
Следующий шаг для сетевого использования — подключить Supabase и перенести данные в таблицы.

## 1. Создать Supabase project

1. Создать новый проект в Supabase.
2. Открыть SQL Editor.
3. Выполнить SQL из `database/schema.sql`.
4. Для временного внутреннего прототипа выполнить SQL из `database/prototype-rls-policies.sql`.

## 2. Добавить env-переменные

Скопировать `.env.example` в `.env.local` и заполнить:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` должен быть адресом проекта вида
`https://project-ref.supabase.co`, без `/rest/v1/` в конце.

Для деплоя эти же переменные нужно добавить в Vercel.

## 3. Важное про безопасность

Сейчас PIN-вход остаётся прототипным. До реальной эксплуатации нужно выбрать один вариант:

- оставить внутренний PIN только за закрытой сетью/VPN;
- или перейти на Supabase Auth и роли сотрудников.

Файл `database/prototype-rls-policies.sql` временно открывает read/write для `anon`.
Это допустимо только для внутреннего прототипа. Перед реальной публичной эксплуатацией
нужно заменить эти политики на авторизацию сотрудников.

## 4. Что переносить из localStorage

Текущие ключи:

- `crm_employee`
- `crm_clients`
- `crm_client_cars`
- `crm_orders`
- `crm_bonus_transactions`
- `crm_loyalty_settings`

После подключения базы эти данные нужно один раз импортировать в таблицы:

- `clients`
- `client_cars`
- `orders`
- `bonus_transactions`
- `loyalty_settings`
