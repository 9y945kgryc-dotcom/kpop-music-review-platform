-- Review likes: one like per user per review; self-likes are blocked by the API.
CREATE TABLE IF NOT EXISTS public.review_likes (
  review_id BIGINT NOT NULL REFERENCES public.song_reviews(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (review_id, user_id)
);
CREATE INDEX IF NOT EXISTS review_likes_user_id_idx ON public.review_likes(user_id);
CREATE INDEX IF NOT EXISTS review_likes_review_id_idx ON public.review_likes(review_id);
