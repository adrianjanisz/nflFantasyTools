create table public.user_rankings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ranking jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_rankings enable row level security;

revoke all on table public.user_rankings from anon, authenticated;
grant select, insert, update on table public.user_rankings to authenticated;

create policy "Users can read their own rankings"
  on public.user_rankings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own rankings"
  on public.user_rankings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own rankings"
  on public.user_rankings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
