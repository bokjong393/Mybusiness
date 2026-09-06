-- SAPA ANALYTICS — Row Level Security
-- Run AFTER schema.sql.
--
-- The model: RLS denies the anon role all direct table access. The browser
-- can only reach data through the SECURITY DEFINER functions in schema.sql,
-- which write narrowly and refuse to read anything per-visitor unless the
-- caller is authenticated.

alter table public.visitors     enable row level security;
alter table public.usage_events enable row level security;

-- No permissive policy is created for anon on either table. With RLS enabled
-- and no matching policy, direct selects/inserts from the browser are denied.
-- This is intentional: a visitor must not be able to read the visitors table,
-- enumerate other people, or read the raw event log.

-- Authenticated admins may read both tables directly (useful for ad-hoc SQL
-- and for Supabase Realtime subscriptions on the dashboard).
drop policy if exists "admins read visitors" on public.visitors;
create policy "admins read visitors" on public.visitors
  for select to authenticated using (true);

drop policy if exists "admins read events" on public.usage_events;
create policy "admins read events" on public.usage_events
  for select to authenticated using (true);

-- ───────────────────────────────────── function grants

-- Public app: may record activity and read aggregate-only counts.
grant execute on function public.sapa_touch_visitor(text, text, boolean) to anon, authenticated;
grant execute on function public.sapa_set_display_name(text, text)       to anon, authenticated;
grant execute on function public.sapa_bump_counter(text, text)           to anon, authenticated;
grant execute on function public.sapa_track_event(text, text, jsonb)     to anon, authenticated;
grant execute on function public.sapa_public_stats()                     to anon, authenticated;

-- Admin reads: granting execute to authenticated is not sufficient on its own
-- — each function also re-checks auth.role() internally, because SECURITY
-- DEFINER would otherwise bypass RLS for whoever managed to call it.
revoke execute on function public.sapa_admin_stats(timestamptz)      from anon;
revoke execute on function public.sapa_admin_visitors(int, timestamptz) from anon;
revoke execute on function public.sapa_admin_activity(int)           from anon;

grant execute on function public.sapa_admin_stats(timestamptz)          to authenticated;
grant execute on function public.sapa_admin_visitors(int, timestamptz)  to authenticated;
grant execute on function public.sapa_admin_activity(int)               to authenticated;

-- Admin accounts are created in the Supabase dashboard (Authentication →
-- Users). Do not ship credentials in this repository. Disable public sign-ups
-- under Authentication → Providers so /admin cannot be self-registered.
