-- ============================================================================
-- HBTYWS911 — Migration: Add songs/music feature
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL Editor. It adds the music library without
-- dropping any existing data. Safe to run once.
-- ============================================================================

-- 1. Create the songs table
create table if not exists public.songs (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(trim(name)) between 1 and 120),
  storage_path  text not null unique,
  public_url    text not null,
  created_at    timestamptz not null default now()
);

-- 2. Add song_id FK to birthdays
alter table public.birthdays
  add column if not exists song_id uuid references public.songs(id) on delete set null;

-- 3. RLS for songs
alter table public.songs enable row level security;

drop policy if exists "songs: admin full access" on public.songs;
create policy "songs: admin full access" on public.songs
  for all to authenticated
  using (true) with check (true);

revoke all on public.songs from anon;

-- 4. Recreate the unlock RPC to include song_url
drop function if exists public.unlock_birthday(text, text) cascade;

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
  begin
    v_dob := p_dob::date;
  exception when others then
    return jsonb_build_object('status', 'invalid');
  end;
  if p_dob is null or to_char(v_dob, 'YYYY-MM-DD') <> p_dob then
    return jsonb_build_object('status', 'invalid');
  end if;

  select id, status, name, theme_id, preset_message_id, custom_message, song_id, date_of_birth
    into v_birthday
  from public.birthdays
  where slug = v_slug
  limit 1;

  if not found then
    return jsonb_build_object('status', 'not_found');
  end if;
  if v_birthday.status <> 'active' then
    return jsonb_build_object('status', 'inactive');
  end if;

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
    delete from public.unlock_attempts where slug = v_slug;

    return jsonb_build_object(
      'status',            'unlocked',
      'name',              v_birthday.name,
      'theme_id',          v_birthday.theme_id,
      'preset_message_id', v_birthday.preset_message_id,
      'custom_message',    v_birthday.custom_message,
      'song_url',          (select s.public_url from public.songs s where s.id = v_birthday.song_id),
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

revoke execute on function public.unlock_birthday(text, text) from public;
grant  execute on function public.unlock_birthday(text, text) to anon, authenticated;

-- 5. Storage bucket for songs
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'birthday-songs',
  'birthday-songs',
  true,
  20971520,
  array['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/x-m4a']
)
on conflict (id) do nothing;

drop policy if exists "birthday-songs: public read" on storage.objects;
create policy "birthday-songs: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'birthday-songs');

drop policy if exists "birthday-songs: admin upload" on storage.objects;
create policy "birthday-songs: admin upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'birthday-songs'
    and lower(name) ~ '\.(mp3|ogg|wav|m4a|aac)$'
  );

drop policy if exists "birthday-songs: admin delete" on storage.objects;
create policy "birthday-songs: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'birthday-songs');

-- Done! The music feature is now live.
