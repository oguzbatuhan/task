-- ONE shared backup table for Daily, Flow and Tasks.
-- Paste into Supabase Dashboard > SQL Editor and run it once. Running it again is safe.
--
-- Data never gets mixed up: each app uses its own row via the (user_id, app) pair
-- ("daily", "flow", "task"). Each user can only see their own rows (RLS).

create table if not exists public.app_backups (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  app        text        not null check (app ~ '^[a-z0-9_-]{1,32}$'),
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);

alter table public.app_backups enable row level security;

revoke all on public.app_backups from anon;
grant select, insert, update, delete on public.app_backups to authenticated;

drop policy if exists "app_backups_select_own" on public.app_backups;
drop policy if exists "app_backups_insert_own" on public.app_backups;
drop policy if exists "app_backups_update_own" on public.app_backups;
drop policy if exists "app_backups_delete_own" on public.app_backups;

create policy "app_backups_select_own" on public.app_backups
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "app_backups_insert_own" on public.app_backups
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "app_backups_update_own" on public.app_backups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "app_backups_delete_own" on public.app_backups
  for delete to authenticated using ((select auth.uid()) = user_id);
