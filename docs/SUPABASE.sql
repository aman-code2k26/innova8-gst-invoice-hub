-- =============================================================
-- Innova8 · WEB-06 · Supabase schema
-- Paste this whole file into:  Supabase → SQL Editor → New query → Run
-- =============================================================

-- 1) One row per user/device holding the whole workspace as JSON.
--    (v2 note: split into clients / invoices tables + per-row RLS —
--     see docs/SUPABASE.md §5)
create table if not exists public.app_state (
  id          text primary key check (id = 'default'),
  owner_id    uuid          default auth.uid(),          -- used once you enable login
  data        jsonb         not null,
  updated_at  timestamptz   not null default now()
);

-- fast "give me my current state" lookup
create index if not exists app_state_updated_at_idx
  on public.app_state (updated_at desc);

-- 2) Row Level Security ---------------------------------------------------
alter table public.app_state enable row level security;

-- DEMEROL ONLY (no login yet): the anon key can read/write this single row.
-- Fine for a college demo because the app stores only a UPI VPA — no bank
-- credentials, no card data. Replace with the policy below before production.
drop policy if exists "demo open access" on public.app_state;
create policy "demo open access"
  on public.app_state
  for all
  using (true)
  with check (true);

-- PRODUCTION (enable Supabase Auth → Email/Password or Anonymous sign-ins,
-- then uncomment). Only the signed-in owner can touch their row:
-- drop policy if exists "owner only" on public.app_state;
-- create policy "owner only"
--   on public.app_state
--   for all
--   using      (owner_id = auth.uid())
--   with check (owner_id = auth.uid());

-- 3) Keep updated_at fresh automatically
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_app_state_touch on public.app_state;
create trigger trg_app_state_touch
  before update on public.app_state
  for each row execute function public.touch_updated_at();

-- =============================================================
-- Quick test (run after the above):
--   insert into public.app_state (id, data)
--   values ('default', '{"hello":"innova8"}'::jsonb)
--   on conflict (id) do update set data = excluded.data;
--   select * from public.app_state;
-- =============================================================
