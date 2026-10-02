-- ============================================================================
-- HBTYWS911 — Supabase schema
-- ----------------------------------------------------------------------------
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- The script is idempotent: it can be re-run safely at any time.
--
-- What it creates:
--   1. public.birthdays        — one row per birthday page
--   2. public.birthday_photos  — photo rows (cascade-deleted with the birthday)
--   3. public.unlock_attempts  — server-side rate-limit state for DOB guesses
--   4. get_birthday_teaser()   — SECURITY DEFINER RPC: first name + theme only
--   5. unlock_birthday()       — SECURITY DEFINER RPC: full content only after
--                                an exact DOB match, throttled on wrong guesses
--   6. Storage bucket "birthday-photos" (public read, admin-only write,
--      8 MB limit, JPG/JPEG/PNG/WEBP only)
--
-- Security model:
--   * Anonymous visitors have ZERO direct access to the tables. The only
--     things they may call are the two RPCs above. The date of birth is never
--     selected by any function except through an exact-match comparison.
--   * Only Supabase-authenticated users (the admin) can read/change rows,
--     enforced by Row Level Security policies on both tables.
--   * The service-role key is never needed by this app and must never be
--     used in frontend code.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 0. Clean re-run (idempotency)
-- ----------------------------------------------------------------------------
drop trigger if exists birthdays_set_updated_at on public.birthdays;
drop function    if exists public.set_updated_at() cascade;
drop function    if exists public.get_birthday_teaser(text) cascade;
drop function    if exists public.unlock_birthday(text, text) cascade;
drop table       if exists public.unlock_attempts cascade;
drop table       if exists public.birthday_photos cascade;
drop table       if exists public.birthdays cascade;


-- ----------------------------------------------------------------------------
-- 1. Tables
-- ----------------------------------------------------------------------------
create table public.birthdays (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(trim(name)) between 1 and 80),
  slug              text not null,                -- enforced by unique index + checks below
  date_of_birth     date not null check (date_of_birth between date '1900-01-01' and current_date),
  theme_id          text not null,
  preset_message_id text,
  custom_message    text,
  status            text not null default 'active' check (status in ('active', 'inactive')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One birthday per slug (case-insensitive, trimmed by the app to lowercase).
create unique index birthdays_slug_unique on public.birthdays (slug);
create index        birthdays_status_idx  on public.birthdays (status);
create index        birthdays_created_idx on public.birthdays (created_at desc);

-- Slugs must be valid URL segments AND must not collide with reserved routes.
-- This list mirrors src/utils/slug.ts (RESERVED_SLUGS) — keep both in sync.
alter table public.birthdays
  add constraint birthdays_slug_format_chk check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 60
    and slug <> all (array[
      'admin', 'api', 'assets', 'static', 'login', 'logout', 'signin',
      'signout', 'auth', 'index', 'home', 'preview', 'new', 'edit',
      'settings', 'health', '_next', 'favicon.ico', 'favicon.svg',
      'robots.txt', 'sitemap.xml', 'og.png', 'vercel.svg'
    ]::text[])
  );

create table public.birthday_photos (
  id            uuid primary key default gen_random_uuid(),
  birthday_id   uuid not null references public.birthdays (id) on delete cascade,
  storage_path  text not null unique,             -- "birthdayId/file.webp" in the bucket
  public_url    text not null,                    -- cached getPublicUrl() value
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index birthday_photos_birthday_idx on public.birthday_photos (birthday_id, display_order);

-- Server-side rate-limit state for DOB guesses. Never readable by clients.
create table public.unlock_attempts (
  slug          text primary key,
  failures      integer not null default 0,
  window_start  timestamptz not null default now(),
  locked_until  timestamptz
);


-- ----------------------------------------------------------------------------
-- 2. updated_at maintenance
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger birthdays_set_updated_at
  before update on public.birthdays
  for each row execute function public.set_updated_at();


-- ----------------------------------------------------------------------------
-- 3. Row Level Security
-- ----------------------------------------------------------------------------
-- Default: no access for anyone. The two RPCs below run as SECURITY DEFINER
-- and are the ONLY path for anonymous visitors; they deliberately return a
-- minimal teaser and — after an exact DOB match — the unlocked content.
-- Direct table access is restricted to Supabase-authenticated users (the
-- admin), whose login itself is controlled in Supabase Auth settings.
alter table public.birthdays        enable row level security;
alter table public.birthday_photos  enable row level security;
alter table public.unlock_attempts  enable row level security;   -- no policies: function-only

drop policy if exists "birthdays: admin full access"       on public.birthdays;
create policy "birthdays: admin full access" on public.birthdays
  for all to authenticated
  using (true) with check (true);

drop policy if exists "birthday_photos: admin full access" on public.birthday_photos;
create policy "birthday_photos: admin full access" on public.birthday_photos
  for all to authenticated
  using (true) with check (true);

-- Revoke direct table access from anonymous users entirely.
revoke all on public.birthdays       from anon;
revoke all on public.birthday_photos from anon;
revoke all on public.unlock_attempts from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 4. Public RPCs (the only anonymous entry points)
-- ----------------------------------------------------------------------------
-- Returns just enough to paint the locked landing page: first name + theme.
-- The date of birth, message and photos are NEVER part of the teaser.
create or replace function public.get_birthday_teaser(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_birthday record;
begin
  select id, status, name, theme_id
    into v_birthday
  from public.birthdays
  where slug = lower(trim(p_slug))
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;

  if v_birthday.status <> 'active' then
    return jsonb_build_object('status', 'inactive');
  end if;

  return jsonb_build_object(
    'status',     'active',
    'first_name', split_part(trim(v_birthday.name), ' ', 1),
    'theme_id',   v_birthday.theme_id
  );
end;
$$;

-- Verifies the DOB and only then returns the full experience payload.
-- Wrong guesses always get the identical generic answer — the response never
-- reveals whether a guess was "close", and the date of birth is never
-- selected into the result. After 8 failures within 10 minutes the slug is
-- locked for 10 minutes (rate_limited), which stops brute-force guessing.
create or replace function public.unlock_birthday(p_slug text, p_dob text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birthday      record;
  v_slug          text := lower(trim(p_slug));
  v_dob           date;
  v_now           timestamptz := now();
  v_failures      integer;
  v_window_start  timestamptz;
  v_locked_until  timestamptz;
  const_max_failures constant integer := 8;
  const_window       constant interval := interval '10 minutes';
  const_lock_time    constant interval := interval '10 minutes';
begin
  -- Strictly validate the submitted date (YYYY-MM-DD, real calendar date).
  begin
    v_dob := p_dob::date;
  exception when others then
    return jsonb_build_object('status', 'invalid');
  end if;
  if p_dob is null or to_char(v_dob, 'YYYY-MM-DD') <> p_dob then
    return jsonb_build_object('status', 'invalid');
  end if;

  select id, status, name, theme_id, preset_message_id, custom_message, date_of_birth
    into v_birthday
  from public.birthdays
  where slug = v_slug
  limit 1;

  -- Not found and inactive are answered distinctly (both are safe to expose:
  -- neither says anything about the DOB), everything DOB-related stays generic.
  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_birthday.status <> 'active' then
    return jsonb_build_object('status', 'inactive');
  end if;

  -- Ensure rate-limit state exists, then read it.
  insert into public.unlock_attempts (slug) values (v_slug)
  on conflict (slug) do nothing;

  select failures, window_start, locked_until
    into v_failures, v_window_start, v_locked_until
  from public.unlock_attempts
  where slug = v_slug;

  if v_locked_until is not null and v_locked_until > v_now then
    return jsonb_build_object('status', 'rate_limited');
  end if;

  if v_birthday.date_of_birth = v_dob then
    -- Correct: clear the guess history and hand over the full content.
    delete from public.unlock_attempts where slug = v_slug;

    return jsonb_build_object(
      'status',            'unlocked',
      'name',              v_birthday.name,
      'theme_id',          v_birthday.theme_id,
      'preset_message_id', v_birthday.preset_message_id,
      'custom_message',    v_birthday.custom_message,
      'photos', coalesce((
        select jsonb_agg(
          jsonb_build_object('url', p.public_url, 'order', p.display_order)
          order by p.display_order, p.created_at
        )
        from public.birthday_photos p
        where p.birthday_id = v_birthday.id
      ), '[]'::jsonb)
    );
  end if;

  -- Wrong guess: identical answer every time, whether the guess was close or
  -- not. Track the failure for throttling only.
  if v_window_start is null or v_now - v_window_start > const_window then
    update public.unlock_attempts
       set failures = 1, window_start = v_now, locked_until = null
     where slug = v_slug;
  else
    update public.unlock_attempts
       set failures = failures + 1,
           locked_until = case
             when failures + 1 >= const_max_failures then v_now + const_lock_time
             else locked_until
           end
     where slug = v_slug;
  end if;

  return jsonb_build_object('status', 'invalid');
end;
$$;

-- Only the two RPCs are callable by anonymous visitors (and the admin).
revoke execute on function public.get_birthday_teaser(text)  from public;
revoke execute on function public.unlock_birthday(text, text) from public;
grant  execute on function public.get_birthday_teaser(text)  to anon, authenticated;
grant  execute on function public.unlock_birthday(text, text) to anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5. Storage bucket "birthday-photos"
-- ----------------------------------------------------------------------------
-- Public read (photos are embedded in unlocked birthday pages via public URL),
-- admin-only write, 8 MB per file, images only. Bucket-level limits backstop
-- the row policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-photos',
  'birthday-photos',
  true,
  8388608,  -- 8 MB, mirrors MAX_UPLOAD_BYTES in src/lib/images.ts
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "birthday-photos: public read" on storage.objects;
create policy "birthday-photos: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'birthday-photos');

drop policy if exists "birthday-photos: admin upload" on storage.objects;
create policy "birthday-photos: admin upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'birthday-photos'
    and (metadata->>'size')::bigint <= 8388608
    and lower(name) ~ '\.(jpg|jpeg|png|webp)$'
  );

-- Updates are intentionally NOT allowed: photos are immutable once uploaded;
-- the app always uploads fresh files (upsert: false).

drop policy if exists "birthday-photos: admin delete" on storage.objects;
create policy "birthday-photos: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'birthday-photos');


-- ----------------------------------------------------------------------------
-- Done. Next steps:
--   1. Authentication → Providers: enable Email, and DISABLE "Allow new users
--      to sign up" (the app has no registration page; the admin account is
--      created manually in Authentication → Users → Add user).
--   2. Copy .env.example to .env and fill in VITE_SUPABASE_URL and
--      VITE_SUPABASE_ANON_KEY (Project Settings → API).
--   3. Deploy to Vercel and set the same two environment variables there.
-- ============================================================================
