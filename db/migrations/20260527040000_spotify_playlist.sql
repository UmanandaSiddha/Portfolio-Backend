-- migrate:up

-- A single curated Spotify playlist URL for the "now playing" widget.
ALTER TABLE site_identity ADD COLUMN spotify_playlist_url text;

-- migrate:down

ALTER TABLE site_identity DROP COLUMN IF EXISTS spotify_playlist_url;
