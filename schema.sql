-- Run this once in the Neon SQL Editor.
CREATE TABLE IF NOT EXISTS song_reviews (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  song_id INTEGER NOT NULL,
  ratings JSONB NOT NULL CHECK (jsonb_typeof(ratings) = 'array' AND jsonb_array_length(ratings) = 7),
  comment TEXT NOT NULL DEFAULT '' CHECK (char_length(comment) <= 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS song_reviews_song_created_idx
  ON song_reviews (song_id, created_at DESC);
