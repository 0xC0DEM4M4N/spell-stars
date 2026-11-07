-- SPELL// STARS accounts: run this once in the Supabase SQL editor.
--
-- One row per account holds that person's lessons, series and a list of
-- deleted ids. Row-level security means a signed-in person can only ever read
-- or change their own row; the public (anon) key can do nothing on its own.
--
-- `plan` is for later: everyone is 'free' now. A paywall can read it (and set
-- it from a payment webhook) without any change to the lesson data.

create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text not null default 'free',
  created_at timestamptz not null default now()
);

alter table public.user_data enable row level security;
alter table public.profiles  enable row level security;

drop policy if exists "own data: read"   on public.user_data;
drop policy if exists "own data: insert" on public.user_data;
drop policy if exists "own data: update" on public.user_data;
drop policy if exists "own data: delete" on public.user_data;
create policy "own data: read"   on public.user_data for select using (auth.uid() = user_id);
create policy "own data: insert" on public.user_data for insert with check (auth.uid() = user_id);
create policy "own data: update" on public.user_data for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own data: delete" on public.user_data for delete using (auth.uid() = user_id);

-- People can read their plan but never change it (only the service role can).
drop policy if exists "own profile: read" on public.profiles;
create policy "own profile: read" on public.profiles for select using (auth.uid() = user_id);

-- Every new account gets a free profile.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep a single account's saved copy small (about 1 MB).
alter table public.user_data drop constraint if exists user_data_size;
alter table public.user_data add constraint user_data_size check (pg_column_size(data) < 1048576);

-- "Delete my account" on the account page. Cascades to the rows above.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
