-- Community features: follows, notifications, public profiles, leaderboard
CREATE TABLE IF NOT EXISTS public.user_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  following_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> following_id),
  CONSTRAINT user_follows_unique UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON public.user_follows(following_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON public.user_follows(follower_id, created_at DESC);
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('follow','new_review','submission_approved','submission_rejected')),
  entity_id BIGINT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS user_notifications_recipient_created_idx ON public.user_notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_unread_idx ON public.user_notifications(recipient_id, read_at) WHERE read_at IS NULL;
