-- Allow one review per signed-in user per song.
-- Anonymous legacy reviews (user_id IS NULL) remain untouched.
CREATE UNIQUE INDEX IF NOT EXISTS song_reviews_one_per_user_song_idx
  ON public.song_reviews (user_id, song_id)
  WHERE user_id IS NOT NULL;
