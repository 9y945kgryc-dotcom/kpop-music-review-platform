-- STAGELOG catalogue expansion (additive model extension)
--
-- Apply only after the normalized base schema in database/schema.sql exists
-- and only on a development Neon branch first. This does NOT migrate the
-- currently deployed legacy song_reviews table.

-- A release can be associated with multiple credited artists.
create table if not exists public.album_artists (
  album_id uuid not null references public.albums(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  credit_role text not null default 'primary',
  sort_order smallint not null default 0,
  primary key (album_id, artist_id)
);

-- A canonical song can appear on multiple releases (album, single, repackage).
-- Track position belongs to the release, not to the canonical song.
create table if not exists public.album_tracks (
  album_id uuid not null references public.albums(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  disc_number smallint not null default 1 check (disc_number > 0),
  track_number smallint not null check (track_number > 0),
  track_title_override text,
  primary key (album_id, disc_number, track_number),
  unique (album_id, song_id, disc_number)
);

-- Alternate recordings / releases remain linked to one canonical song.
create table if not exists public.song_versions (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  version_type text not null check (version_type in (
    'original', 'japanese', 'english', 'remix', 'instrumental',
    'live', 'acoustic', 'sped_up', 'slowed', 'other'
  )),
  title text not null,
  language_code text,
  release_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Group / unit membership history. A member is represented as an artist
-- record of type solo or other, allowing the same person to join multiple groups.
create table if not exists public.artist_members (
  group_artist_id uuid not null references public.artists(id) on delete cascade,
  member_artist_id uuid not null references public.artists(id) on delete cascade,
  joined_on date,
  left_on date,
  member_position text,
  sort_order smallint not null default 0,
  primary key (group_artist_id, member_artist_id, joined_on),
  check (group_artist_id <> member_artist_id),
  check (left_on is null or joined_on is null or left_on >= joined_on)
);

create index if not exists idx_album_artists_artist on public.album_artists(artist_id, album_id);
create index if not exists idx_album_tracks_song on public.album_tracks(song_id, album_id);
create index if not exists idx_song_versions_song on public.song_versions(song_id, release_date);
create index if not exists idx_artist_members_member on public.artist_members(member_artist_id, group_artist_id);

-- Data migration guidance:
-- 1. Back up the database and test on a Neon branch.
-- 2. Populate album_artists from albums.artist_id where that legacy column is set.
-- 3. Populate album_tracks from songs.album_id, using a verified track_number mapping.
-- 4. Do not infer track numbers or version relationships automatically.
-- 5. Keep the original album_id / artist_id columns until application code has
--    been migrated and verified; drop them only in a separately reviewed migration.