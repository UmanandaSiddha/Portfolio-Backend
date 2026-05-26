-- migrate:up

CREATE TABLE side_facts (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    k           text NOT NULL,
    v           text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_side_facts_sort ON side_facts (sort_order);
CREATE TRIGGER trg_side_facts_touch_updated_at
    BEFORE UPDATE ON side_facts
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE projects (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        text NOT NULL UNIQUE,
    name        text NOT NULL,
    sub         text NOT NULL,
    summary     text NOT NULL,
    tags        text[] NOT NULL DEFAULT '{}',
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_projects_sort ON projects (sort_order);
CREATE TRIGGER trg_projects_touch_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE project_metrics (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    k           text NOT NULL,
    v           text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_metrics_project ON project_metrics (project_id, sort_order);

CREATE TABLE project_bullets (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    body        text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_project_bullets_project ON project_bullets (project_id, sort_order);

CREATE TABLE oss_repos (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name            text NOT NULL,
    repo            text NOT NULL,
    description     text NOT NULL,
    lang            text NOT NULL,
    stars           integer NOT NULL DEFAULT 0,
    updated_label   text NOT NULL,
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_oss_sort ON oss_repos (sort_order);
CREATE TRIGGER trg_oss_repos_touch_updated_at
    BEFORE UPDATE ON oss_repos
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE talks (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    when_label      text NOT NULL,
    title           text NOT NULL,
    where_label     text NOT NULL,
    slides_url      text,
    sort_order      integer NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_talks_sort ON talks (sort_order);
CREATE TRIGGER trg_talks_touch_updated_at
    BEFORE UPDATE ON talks
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TYPE book_status AS ENUM ('done', 'reading', 'queued');

CREATE TABLE books (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title               text NOT NULL,
    author              text NOT NULL,
    status              book_status NOT NULL DEFAULT 'queued',
    pct                 integer NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
    cover_image_url     text,
    cover_image_key     text,    -- S3 key for cleanup
    buy_url             text,
    sort_order          integer NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_books_sort ON books (sort_order);
CREATE TRIGGER trg_books_touch_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE uses_groups (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key         text NOT NULL UNIQUE,   -- 'editor' | 'hardware' | 'stack'
    label       text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_uses_groups_touch_updated_at
    BEFORE UPDATE ON uses_groups
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE uses_items (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id    uuid NOT NULL REFERENCES uses_groups(id) ON DELETE CASCADE,
    lbl         text NOT NULL,
    sub         text NOT NULL,
    val         text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_uses_items_group ON uses_items (group_id, sort_order);
CREATE TRIGGER trg_uses_items_touch_updated_at
    BEFORE UPDATE ON uses_items
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE now_playing (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    track       text NOT NULL,
    artist      text NOT NULL,
    sort_order  integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_now_playing_sort ON now_playing (sort_order);
CREATE TRIGGER trg_now_playing_touch_updated_at
    BEFORE UPDATE ON now_playing
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- migrate:down

DROP TABLE IF EXISTS now_playing;
DROP TABLE IF EXISTS uses_items;
DROP TABLE IF EXISTS uses_groups;
DROP TABLE IF EXISTS books;
DROP TYPE  IF EXISTS book_status;
DROP TABLE IF EXISTS talks;
DROP TABLE IF EXISTS oss_repos;
DROP TABLE IF EXISTS project_bullets;
DROP TABLE IF EXISTS project_metrics;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS side_facts;
