-- STAGELOG user-submitted catalogue moderation
-- Run this on the Neon branch used by the Pages deployment before deploying the API.
-- Does not alter or delete the existing songs, artists, or song_reviews tables.

CREATE TABLE IF NOT EXISTS public.catalog_submissions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('song','album')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  submitted_by TEXT,
  admin_note TEXT NOT NULL DEFAULT '',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(payload) = 'object')
);

CREATE INDEX IF NOT EXISTS catalog_submissions_status_created_idx
  ON public.catalog_submissions (status, created_at DESC);

-- Approved album metadata is kept separately because the current live song
-- catalogue uses the legacy artists / songs schema. Track IDs point to songs.id.
CREATE TABLE IF NOT EXISTS public.stagelog_albums (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  release_date DATE,
  release_type TEXT NOT NULL DEFAULT 'album',
  cover_image_url TEXT,
  track_song_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (jsonb_typeof(track_song_ids) = 'array')
);
