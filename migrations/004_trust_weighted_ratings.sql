-- STAGELOG trust-weighted and Bayesian song ratings
-- All existing and new users begin with neutral weight 1.0.
-- A user's fandom/artist preference alone must never reduce this weight.
CREATE TABLE IF NOT EXISTS public.user_rating_trust (
  user_id BIGINT PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  trust_weight NUMERIC(4,3) NOT NULL DEFAULT 1.000
    CHECK (trust_weight >= 0.200 AND trust_weight <= 1.000),
  reason TEXT NOT NULL DEFAULT 'neutral',
  manual_override BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_rating_count INTEGER NOT NULL DEFAULT 0,
  distinct_artist_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.user_rating_trust (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.rating_integrity_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  song_id INTEGER REFERENCES public.songs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'rating_burst', 'coordinated_pattern', 'account_cluster',
    'manual_review', 'cleared'
  )),
  risk_level TEXT NOT NULL DEFAULT 'review'
    CHECK (risk_level IN ('info', 'review', 'high')),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS rating_integrity_events_created_idx
  ON public.rating_integrity_events(created_at DESC);
CREATE INDEX IF NOT EXISTS rating_integrity_events_user_idx
  ON public.rating_integrity_events(user_id, created_at DESC);
