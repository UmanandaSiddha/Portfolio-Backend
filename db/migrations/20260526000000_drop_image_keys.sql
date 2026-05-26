-- migrate:up

-- S3 is gone. The `_key` columns tracked S3 object keys so we could DELETE
-- on cover replace; now images are plain URLs (Gravatar / Google / typed-in)
-- so there is nothing to delete and no key to store.

ALTER TABLE books         DROP COLUMN IF EXISTS cover_image_key;
ALTER TABLE site_identity DROP COLUMN IF EXISTS avatar_key;

-- migrate:down

ALTER TABLE books         ADD COLUMN cover_image_key text;
ALTER TABLE site_identity ADD COLUMN avatar_key      text;
