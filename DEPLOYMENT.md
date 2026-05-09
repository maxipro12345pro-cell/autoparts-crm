# Деплой

Рекомендуемый вариант: Vercel + Supabase.

## 1. GitHub

Создать репозиторий и загрузить проект.

Перед загрузкой проверить:

```bash
npm run lint
npm run typecheck
npm run build
```

`.env.local` не должен попадать в репозиторий. В проекте есть `.env.example`.

## 2. Vercel

1. Import Project из GitHub.
2. Framework Preset: Next.js.
3. Build Command: `npm run build`.
4. Output Directory оставить пустым.
5. Добавить Environment Variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

URL должен быть без `/rest/v1/`.

## 3. Проверка после деплоя

1. Открыть сайт.
2. Войти по PIN.
3. Создать тестового клиента.
4. Проверить, что клиент появился в Supabase таблице `clients`.
5. Открыть сайт в другом браузере и убедиться, что клиент виден.

## Важное ограничение

PIN-вход остаётся прототипным. Для публичного использования нужно будет добавить полноценную авторизацию или закрыть доступ к приложению на уровне инфраструктуры.

Для текущего внутреннего прототипа используются временные Supabase RLS policies из
`database/prototype-rls-policies.sql`, которые разрешают `anon` read/write.
Не использовать такой режим для публичной CRM без дополнительной защиты.
