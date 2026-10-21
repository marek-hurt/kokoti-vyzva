-- Základní schéma. Složeno z README a typů v lib/supabase.ts, protože původní
-- migrace produkce v repu nebyly. Musí běžet před 20260924000000_enable_rls.sql,
-- které na tyhle tabulky navazuje.

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  avatar_url text,
  initials text not null,
  color text not null,
  created_at timestamptz default now()
);

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  date date not null,
  beh numeric default 0,
  kolo numeric default 0,
  bazen numeric default 0,
  kokotmetr integer default 0,
  no_alcohol boolean default false,
  weight numeric,
  pushups boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists public.settings (
  id text primary key,
  challenge_start date not null,
  challenge_end date not null,
  sunny_day date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create or replace view public.leaderboard as
select
  u.id,
  u.name,
  u.initials,
  u.color,
  u.avatar_url,
  coalesce(sum(a.beh), 0) as total_beh,
  coalesce(sum(a.kolo), 0) as total_kolo,
  coalesce(sum(a.bazen), 0) as total_bazen,
  coalesce(sum(a.kokotmetr), 0) as total_kokotmetr,
  count(case when a.no_alcohol then 1 end) as sober_days,
  coalesce(
    sum(a.beh) +
    floor(sum(a.kolo) / 10) * 2 +
    floor(sum(a.bazen)) * 2 +
    sum(a.kokotmetr) +
    count(case when a.no_alcohol then 1 end),
    0
  ) as total_points
from public.users u
left join public.activities a on u.id = a.user_id
group by u.id, u.name, u.initials, u.color, u.avatar_url
order by total_points desc;
