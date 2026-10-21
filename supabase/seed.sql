-- Jen pro lokální vývoj (supabase db reset). Heslo sdíleného účtu: kokot

-- Sdílený účet (e-mail musí odpovídat SHARED_ACCOUNT_EMAIL v lib/supabase.ts)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'vyzva@kokoti-vyzva.cz',
  crypt('kokot', gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{}', now(), now(),
  '', '', '', ''
);

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"vyzva@kokoti-vyzva.cz","email_verified":true}',
  'email', now(), now(), now()
);

insert into public.settings (id, challenge_start, challenge_end, sunny_day)
values ('global', '2026-10-04', '2026-11-12', '2026-10-08');

insert into public.users (id, name, initials, color) values
  ('a0000000-0000-0000-0000-000000000001', 'Karel',  'KB', 'avatar-lime'),
  ('a0000000-0000-0000-0000-000000000002', 'Pepa',   'PE', 'avatar-coral'),
  ('a0000000-0000-0000-0000-000000000003', 'Honza',  'HO', 'avatar-blue'),
  ('a0000000-0000-0000-0000-000000000004', 'Tomáš',  'TO', 'avatar-orange'),
  ('a0000000-0000-0000-0000-000000000005', 'Martin', 'MA', 'avatar-violet');

-- Každý sport se losuje zvlášť, takže se v jednom dni potkávají i kombinace
-- (běh + kolo, kolo + plavání, všechny tři...) a občas i den bez pohybu.
-- Deterministicky přes setseed, ať jsou data pokaždé stejná.
select setseed(0.42);
insert into public.activities (user_id, date, beh, kolo, bazen, kokotmetr, no_alcohol, weight, pushups)
select
  u.id,
  d::date,
  case when r.beh   then round((3 + random() * 9)::numeric, 1) else 0 end,
  case when r.kolo  then round((15 + random() * 45)::numeric, 1) else 0 end,
  case when r.bazen then round((0.5 + random() * 2.5)::numeric, 1) else 0 end,
  case when r.beh or r.kolo then floor(random() * 8)::int else 0 end,
  random() < 0.5,
  round((80 - (d::date - date '2026-10-04') * 0.15 + random())::numeric, 1),
  random() < 0.8
from public.users u
cross join generate_series(date '2026-10-04', date '2026-10-12', interval '1 day') d
cross join lateral (
  -- hash zajistí, že se hodnoty počítají pro každý řádek zvlášť (volatilní
  -- random() v nekorelovaném lateral dotazu by se vyhodnotil jen jednou)
  select
    abs(hashtext(u.name || d::text || 'beh'))   % 100 < 55 as beh,
    abs(hashtext(u.name || d::text || 'kolo'))  % 100 < 40 as kolo,
    abs(hashtext(u.name || d::text || 'bazen')) % 100 < 30 as bazen
) r;
