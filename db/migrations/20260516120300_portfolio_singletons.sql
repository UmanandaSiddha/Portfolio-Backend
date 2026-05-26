-- migrate:up

-- All singleton tables enforce a single row via CHECK (id = 1).
-- Use INSERT ... ON CONFLICT (id) DO UPDATE for upserts.

CREATE TABLE site_identity (
    id          smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    name        text NOT NULL,
    role        text NOT NULL,
    email       text NOT NULL,
    phone       text,
    location    text,
    github      text,
    linkedin    text,
    site_url    text,
    avatar_url  text,
    avatar_key  text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_site_identity_touch_updated_at
    BEFORE UPDATE ON site_identity
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE site_status (
    id              smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    available       text NOT NULL,
    currently_at    text,
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_site_status_touch_updated_at
    BEFORE UPDATE ON site_status
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE hero (
    id                  smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    eyebrow             text NOT NULL,
    headline            text[] NOT NULL DEFAULT '{}',
    lede                text NOT NULL,
    current_card        jsonb NOT NULL DEFAULT '{}'::jsonb,
    stack_pills         text[] NOT NULL DEFAULT '{}',
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_hero_touch_updated_at
    BEFORE UPDATE ON hero
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE about (
    id          smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    prose       text[] NOT NULL DEFAULT '{}',
    footnote    text,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_about_touch_updated_at
    BEFORE UPDATE ON about
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- migrate:down

DROP TABLE IF EXISTS about;
DROP TABLE IF EXISTS hero;
DROP TABLE IF EXISTS site_status;
DROP TABLE IF EXISTS site_identity;
