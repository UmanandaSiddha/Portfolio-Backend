-- migrate:up

-- Per-section visibility toggles for the landing page.
-- Sections not present in this table default to visible (forward-compat).
CREATE TABLE sections (
    key         text PRIMARY KEY,
    label       text NOT NULL,
    visible     boolean NOT NULL DEFAULT true,
    sort_order  integer NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_sections_touch_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Seed with every landing-page section we currently render. Keys match the
-- section element ids in client/components/sections/*.tsx.
INSERT INTO sections (key, label, visible, sort_order) VALUES
    ('intro',    'Intro',          true,  1),
    ('about',    'About',          true,  2),
    ('work',     'Projects',       true,  3),
    ('oss',      'Open source',    true,  4),
    ('blog',     'Writing / blog', true,  5),
    ('diary',    'Diary',          true,  6),
    ('term',     'Terminal',       true,  7),
    ('talks',    'Talks',          true,  8),
    ('reading',  'Reading',        true,  9),
    ('uses',     'Uses',           true, 10),
    ('contact',  'Contact',        true, 11);

-- migrate:down

DROP TABLE IF EXISTS sections;
