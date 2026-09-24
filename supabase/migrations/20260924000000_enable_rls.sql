-- Zamknutí databáze za přihlášení.
--
-- Výzva používá jeden sdílený účet v Supabase Auth. Přihlašovací obrazovka
-- volá signInWithPassword(), takže heslo ověřuje databáze, ne JavaScript.
-- Politiky níže proto pouštějí výhradně roli "authenticated".
--
-- Role "anon" (klíč, který je veřejně v JS bundlu) nedostane ŽÁDNOU politiku,
-- takže se zapnutým RLS neuvidí ani řádek a nic nezapíše. Tím je robot
-- se scrapnutým anon klíčem odstřižený.
--
-- POZOR: tohle funguje jen když je v Dashboardu vypnutá registrace nových
-- uživatelů. Jinak se bot zaregistruje sám, dostane roli authenticated
-- a politiky ho pustí dovnitř. Viz postup v odpovědi.

-- ------------------------------------------------------------------ users
alter table public.users enable row level security;

drop policy if exists "users read for anyone" on public.users;
drop policy if exists "users read when logged in" on public.users;
create policy "users read when logged in"
  on public.users
  for select
  to authenticated
  using (true);

-- ------------------------------------------------------------- activities
alter table public.activities enable row level security;

drop policy if exists "activities read for anyone" on public.activities;
drop policy if exists "activities insert for anyone" on public.activities;
drop policy if exists "activities update for anyone" on public.activities;
drop policy if exists "activities delete for anyone" on public.activities;

drop policy if exists "activities read when logged in" on public.activities;
create policy "activities read when logged in"
  on public.activities
  for select
  to authenticated
  using (true);

drop policy if exists "activities insert when logged in" on public.activities;
create policy "activities insert when logged in"
  on public.activities
  for insert
  to authenticated
  with check (true);

drop policy if exists "activities update when logged in" on public.activities;
create policy "activities update when logged in"
  on public.activities
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "activities delete when logged in" on public.activities;
create policy "activities delete when logged in"
  on public.activities
  for delete
  to authenticated
  using (true);

-- --------------------------------------------------------------- settings
alter table public.settings enable row level security;

drop policy if exists "settings read for anyone" on public.settings;
drop policy if exists "settings read when logged in" on public.settings;
create policy "settings read when logged in"
  on public.settings
  for select
  to authenticated
  using (true);

-- Žádná insert/update/delete politika: zápis smí jen service role
-- (edge funkce update-settings), a ta RLS obchází.

-- ------------------------------------------------------------ leaderboard
-- Může to být view nebo tabulka, ošetříme obojí.
do $$
declare
  kind "char";
begin
  select c.relkind into kind
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relname = 'leaderboard';

  if kind is null then
    raise notice 'public.leaderboard neexistuje, přeskakuji';

  elsif kind = 'v' then
    -- Bez security_invoker by view četlo daty očima svého vlastníka
    -- a RLS podkladových tabulek by se obešlo.
    execute 'alter view public.leaderboard set (security_invoker = on)';
    execute 'revoke all on public.leaderboard from anon';

  elsif kind = 'r' or kind = 'p' then
    execute 'alter table public.leaderboard enable row level security';
    execute 'drop policy if exists "leaderboard read for anyone" on public.leaderboard';
    execute 'drop policy if exists "leaderboard read when logged in" on public.leaderboard';
    execute 'create policy "leaderboard read when logged in" on public.leaderboard
               for select to authenticated using (true)';

  elsif kind = 'm' then
    -- Materializovaný view neumí RLS, řeší se to odebráním práv.
    execute 'revoke all on public.leaderboard from anon';
    raise notice 'leaderboard je materialized view - anon odebran, RLS na nej nelze';
  end if;
end $$;
