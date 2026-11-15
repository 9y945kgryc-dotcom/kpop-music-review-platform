-- STAGELOG PostgreSQL schema
-- Apply after creating the Neon project and enabling Neon Auth.
-- Auth identities are stored by Neon Auth in the neon_auth schema.
-- This app schema stores only the auth user ID, not passwords or OAuth tokens.

create extension if not exists pgcrypto;

create table if not exists public.user_profiles (
  user_id text primary key,
  username text not null unique,
  display_name text not null,
  bio text not null default '',
  avatar_url text,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_length check (char_length(username) between 3 and 24),
  constraint display_name_length check (char_length(display_name) between 1 and 40)
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  name_ko text,
  artist_type text not null default 'group' check (artist_type in ('group', 'solo', 'band', 'other')),
  agency text,
  debut_date date,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists(id) on delete set null,
  title text not null,
  release_date date,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.albums(id) on delete set null,
  title text not null,
  title_ko text,
  release_date date,
  cover_image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.song_artists (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  credit_role text not null default 'main',
  sort_order smallint not null default 0,
  primary key (song_id, artist_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.user_profiles(user_id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  body text not null default '',
  status text not null default 'published' check (status in ('draft', 'published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, song_id),
  constraint review_body_length check (char_length(body) <= 5000)
);

-- All scores are independently supplied by the reviewer.
-- overall_score is NOT calculated from the six category scores.
create table if not exists public.review_scores (
  review_id uuid primary key references public.reviews(id) on delete cascade,
  song_structure numeric(2,1) not null check (song_structure between 0 and 5 and song_structure * 10 = trunc(song_structure * 10)),
  sound_arrangement numeric(2,1) not null check (sound_arrangement between 0 and 5 and sound_arrangement * 10 = trunc(sound_arrangement * 10)),
  vocal_rap numeric(2,1) not null check (vocal_rap between 0 and 5 and vocal_rap * 10 = trunc(vocal_rap * 10)),
  concept_originality numeric(2,1) not null check (concept_originality between 0 and 5 and concept_originality * 10 = trunc(concept_originality * 10)),
  expression_emotion numeric(2,1) not null check (expression_emotion between 0 and 5 and expression_emotion * 10 = trunc(expression_emotion * 10)),
  catchiness_impression numeric(2,1) not null check (catchiness_impression between 0 and 5 and catchiness_impression * 10 = trunc(catchiness_impression * 10)),
  overall_score numeric(2,1) not null check (overall_score between 0 and 5 and overall_score * 10 = trunc(overall_score * 10)),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_likes (
  user_id text not null references public.user_profiles(user_id) on delete cascade,
  review_id uuid not null references public.reviews(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, review_id)
);

create table if not exists public.favorite_songs (
  user_id text not null references public.user_profiles(user_id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id text not null references public.user_profiles(user_id) on delete cascade,
  parent_id uuid references public.review_comments(id) on delete cascade,
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  constraint comment_body_length check (char_length(body) between 1 and 2000)
);

create table if not exists public.user_follows (
  follower_id text not null references public.user_profiles(user_id) on delete cascade,
  following_id text not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint cannot_follow_self check (follower_id <> following_id)
);

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null references public.user_profiles(user_id) on delete cascade,
  target_type text not null check (target_type in ('review', 'comment', 'profile')),
  target_id text not null,
  reason text not null,
  details text not null default '',
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_songs_release_date on public.songs(release_date desc);
create index if not exists idx_song_artists_artist on public.song_artists(artist_id, song_id);
create index if not exists idx_reviews_song_status on public.reviews(song_id, status, created_at desc);
create index if not exists idx_reviews_user_created on public.reviews(user_id, created_at desc);
create index if not exists idx_review_comments_review on public.review_comments(review_id, created_at);
create index if not exists idx_content_reports_status on public.content_reports(status, created_at);

-- Ranking queries should aggregate published reviews only.
create or replace view public.song_review_aggregates as
select
  r.song_id,
  count(*)::bigint as review_count,
  round(avg(s.overall_score), 1) as average_overall_score,
  round(avg(s.song_structure), 1) as average_song_structure,
  round(avg(s.sound_arrangement), 1) as average_sound_arrangement,
  round(avg(s.vocal_rap), 1) as average_vocal_rap,
  round(avg(s.concept_originality), 1) as average_concept_originality,
  round(avg(s.expression_emotion), 1) as average_expression_emotion,
  round(avg(s.catchiness_impression), 1) as average_catchiness_impression
from public.reviews r
join public.review_scores s on s.review_id = r.id
where r.status = 'published'
group by r.song_id;
