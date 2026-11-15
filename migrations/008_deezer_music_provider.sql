-- Add Deezer as the sole active music catalogue and embed provider.
-- Keep legacy Spotify / Apple Music columns intact to avoid deleting historical values.
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS deezer_url text;

ALTER TABLE public.stagelog_albums
  ADD COLUMN IF NOT EXISTS deezer_url text;

COMMENT ON COLUMN public.songs.deezer_url IS 'Canonical Deezer track URL used for the official Deezer widget player.';
COMMENT ON COLUMN public.stagelog_albums.deezer_url IS 'Canonical Deezer album URL used for the official Deezer widget player.';
