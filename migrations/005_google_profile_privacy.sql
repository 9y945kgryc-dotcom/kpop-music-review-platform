-- Google profile privacy: stop retaining imported Google profile photos.
-- Existing user-selected nicknames are intentionally preserved.
UPDATE public.users
SET avatar_url = NULL
WHERE avatar_url IS NOT NULL;
