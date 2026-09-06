-- SAPA ANALYTICS — schema
-- Run this in the Supabase SQL editor, then run policies.sql.
--
-- Design note: the browser never touches these tables directly. All writes go
-- through SECURITY DEFINER functions below, so the public anon key can record
-- activity without being able to read anybody's row. Row Level Security
-- (policies.sql) denies direct table access to the anon role entirely.

-- ─────────────────────────────────────────────────────────── tables

create table if not exists public.visitors (
  id                      uuid primary key default gen_random_uuid(),
  visitor_id              text unique not null,
  display_name            text,
  first_seen_at           timestamptz not null default now(),
  last_seen_at            timestamptz not null default now(),
  visit_count             integer not null default 1,
  meter_count             integer not null default 0,
  battle_started_count    integer not null default 0,
  battle_completed_count  integer not null default 0,
  lab_count               integer not null default 0,
  share_count             integer not null default 0,
  download_count          integer not null default 0,
  created_at              timestamptz not null default now(),
  -- Names are user-supplied and shown in an admin table; cap the length here
  -- too, so the constraint holds even if a client skips its own validation.
  constraint display_name_length check (display_name is null or char_length(display_name) <= 40)
);

-- NOTE: no financial columns. Raw balances and spending never reach this table.

create table if not exists public.usage_events (
  id             uuid primary key default gen_random_uuid(),
  visitor_id     text not null,
  event_name     text not null,
  event_metadata jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists usage_events_created_idx on public.usage_events (created_at desc);
create index if not exists usage_events_name_idx    on public.usage_events (event_name);
create index if not exists usage_events_visitor_idx on public.usage_events (visitor_id);
create index if not exists visitors_last_seen_idx   on public.visitors (last_seen_at desc);

-- ──────────────────────────────────────────────── write functions (public)

-- Upsert the visitor and, when this is a new browser session, count a visit.
create or replace function public.sapa_touch_visitor(
  p_visitor_id   text,
  p_display_name text default null,
  p_count_visit  boolean default true
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_visitor_id is null or char_length(p_visitor_id) not between 8 and 64 then
    raise exception 'invalid visitor id';
  end if;

  insert into public.visitors (visitor_id, display_name)
  values (p_visitor_id, nullif(left(p_display_name, 40), ''))
  on conflict (visitor_id) do update
    set last_seen_at = now(),
        visit_count  = public.visitors.visit_count + (case when p_count_visit then 1 else 0 end),
        -- Never overwrite a stored name with null: a returning visitor who
        -- skipped the prompt this time should keep the name they gave before.
        display_name = coalesce(nullif(left(p_display_name, 40), ''), public.visitors.display_name);
end;
$$;

create or replace function public.sapa_set_display_name(
  p_visitor_id   text,
  p_display_name text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.visitors
     set display_name = nullif(left(p_display_name, 40), ''),
         last_seen_at = now()
   where visitor_id = p_visitor_id;
end;
$$;

-- Increment one counter. The column name is whitelisted here rather than
-- interpolated, so a caller cannot reach an arbitrary column.
create or replace function public.sapa_bump_counter(
  p_visitor_id text,
  p_counter    text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  case p_counter
    when 'meter_count' then
      update public.visitors set meter_count = meter_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    when 'battle_started_count' then
      update public.visitors set battle_started_count = battle_started_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    when 'battle_completed_count' then
      update public.visitors set battle_completed_count = battle_completed_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    when 'lab_count' then
      update public.visitors set lab_count = lab_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    when 'share_count' then
      update public.visitors set share_count = share_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    when 'download_count' then
      update public.visitors set download_count = download_count + 1, last_seen_at = now() where visitor_id = p_visitor_id;
    else
      raise exception 'unknown counter %', p_counter;
  end case;
end;
$$;

create or replace function public.sapa_track_event(
  p_visitor_id text,
  p_event_name text,
  p_metadata   jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event_name is null or char_length(p_event_name) > 64 then
    raise exception 'invalid event name';
  end if;

  insert into public.usage_events (visitor_id, event_name, event_metadata)
  values (p_visitor_id, p_event_name, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

-- ─────────────────────────────────────────── read functions

-- Aggregate-only counts, safe for the public homepage counter. Returns no
-- per-visitor detail whatsoever.
create or replace function public.sapa_public_stats()
returns table (
  unique_visitors   bigint,
  meter_completed   bigint,
  battles_started   bigint,
  battles_completed bigint
)
language sql security definer set search_path = public stable as $$
  select
    (select count(*) from public.visitors),
    (select coalesce(sum(meter_count), 0) from public.visitors),
    (select coalesce(sum(battle_started_count), 0) from public.visitors),
    (select coalesce(sum(battle_completed_count), 0) from public.visitors);
$$;

-- Admin-only. auth.role() is checked inside the function because SECURITY
-- DEFINER bypasses RLS; without this check the anon key could read everything.
create or replace function public.sapa_admin_stats(p_since timestamptz default null)
returns table (
  unique_visitors   bigint,
  total_visits      bigint,
  returning_visitors bigint,
  named_visitors    bigint,
  meter_completed   bigint,
  battles_started   bigint,
  battles_completed bigint,
  lab_uses          bigint,
  shares            bigint,
  downloads         bigint,
  sharing_visitors  bigint
)
language plpgsql security definer set search_path = public stable as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'admin authentication required';
  end if;

  return query
  with scoped as (
    select * from public.visitors v
    where p_since is null or v.last_seen_at >= p_since
  )
  select
    (select count(*) from scoped),
    (select coalesce(sum(visit_count), 0) from scoped),
    (select count(*) from scoped where visit_count > 1),
    (select count(*) from scoped where display_name is not null),
    (select coalesce(sum(meter_count), 0) from scoped),
    (select coalesce(sum(battle_started_count), 0) from scoped),
    (select coalesce(sum(battle_completed_count), 0) from scoped),
    (select coalesce(sum(lab_count), 0) from scoped),
    (select coalesce(sum(share_count), 0) from scoped),
    (select coalesce(sum(download_count), 0) from scoped),
    (select count(*) from scoped where share_count > 0);
end;
$$;

create or replace function public.sapa_admin_visitors(
  p_limit int default 25,
  p_since timestamptz default null
)
returns setof public.visitors
language plpgsql security definer set search_path = public stable as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'admin authentication required';
  end if;

  return query
    select * from public.visitors v
    where p_since is null or v.last_seen_at >= p_since
    order by v.visit_count desc, v.last_seen_at desc
    limit least(greatest(p_limit, 1), 200);
end;
$$;

-- Activity feed. Joins names but deliberately returns no event metadata, so
-- nothing financial can surface in the dashboard.
create or replace function public.sapa_admin_activity(p_limit int default 20)
returns table (display_name text, event_name text, created_at timestamptz)
language plpgsql security definer set search_path = public stable as $$
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'admin authentication required';
  end if;

  return query
    select v.display_name, e.event_name, e.created_at
    from public.usage_events e
    left join public.visitors v on v.visitor_id = e.visitor_id
    order by e.created_at desc
    limit least(greatest(p_limit, 1), 100);
end;
$$;
