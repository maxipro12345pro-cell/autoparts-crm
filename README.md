# Autoparts CRM

Внутренняя CRM для магазина автозапчастей.

## Текущий функционал

- PIN-вход сотрудника.
- Панель управления.
- Клиенты и карточка клиента.
- Автомобили клиента.
- Заказы и активные заказы.
- Бонусные операции и настройки бонусной программы.
- Хранение данных в Supabase с локальным fallback.

## Запуск локально

```bash
npm install
npm run dev
```

Открыть `http://localhost:3000`.

## Переменные окружения

Создать `.env.local` по примеру `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`NEXT_PUBLIC_SUPABASE_URL` должен быть вида `https://project-ref.supabase.co`, без `/rest/v1/`.

## Проверки

```bash
npm run lint
npm run typecheck
npm run build
```

## База данных

SQL-схема лежит в `database/schema.sql`.
