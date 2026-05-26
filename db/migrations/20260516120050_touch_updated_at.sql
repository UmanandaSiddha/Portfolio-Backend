-- migrate:up

-- Generic trigger function that stamps updated_at = now() on every UPDATE.
-- Attach with: CREATE TRIGGER trg_touch_updated_at BEFORE UPDATE ON <table>
--              FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- migrate:down

DROP FUNCTION IF EXISTS touch_updated_at();
