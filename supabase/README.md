# Supabase Notes

The first schema lives in [supabase/migrations/20260415_initial.sql](migrations/20260415_initial.sql).

## Tables

- `profiles`
- `user_preferences`
- `thought_records`

## Environment

Set one of these keys:

- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

And always set:

- `EXPO_PUBLIC_SUPABASE_URL`

## First setup

1. create the Supabase project
2. apply the migration
3. enable email auth
4. confirm redirect URLs match the app scheme and web host
5. copy the URL and key into `.env`
