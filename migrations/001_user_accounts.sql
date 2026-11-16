-- STAGELOG user accounts and personal page
CREATE TABLE IF NOT EXISTS public.users (
  id BIGSERIAL PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_sessions_expires_idx ON public.user_sessions(expires_at);
ALTER TABLE public.song_reviews ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS song_reviews_user_created_idx ON public.song_reviews(user_id, created_at DESC);
ALTER TABLE public.catalog_submissions ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS catalog_submissions_user_created_idx ON public.catalog_submissions(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('song','album')),
  target_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS user_favorites_user_created_idx ON public.user_favorites(user_id, created_at DESC);
