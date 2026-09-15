# Fantasy Rankings

A private fantasy-football ranking board backed by Supabase Auth and Postgres.

## Local setup

1. Create a Supabase project.
2. Run `supabase/migrations/20260915000000_create_user_rankings.sql` in the Supabase SQL Editor.
3. In **Authentication → Providers → Email**, keep email/password enabled and turn **Confirm email** off.
4. Copy `.env.example` to `.env.local`, then fill in the project URL and publishable key from Supabase's Connect dialog.
5. In **Authentication → URL Configuration**, add `http://localhost:3000` as the Site URL and Redirect URL.
6. Run `npm install` and `npm run dev`.

## Vercel deployment

1. Import this GitHub repository into Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Preview and Production environment settings.
3. Deploy `main` and copy its `*.vercel.app` URL.
4. In Supabase URL Configuration, set that URL as the Site URL and add it to Redirect URLs. Add `https://*.vercel.app` as a Redirect URL to support Vercel previews.

No service-role key belongs in Vercel. The publishable key is safe to expose because the `user_rankings` table is protected by Row Level Security.
