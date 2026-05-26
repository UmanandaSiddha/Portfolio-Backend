-- migrate:up

CREATE TYPE post_kind AS ENUM ('blog', 'diary');

CREATE TABLE posts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sanity_id           text NOT NULL UNIQUE,
    kind                post_kind NOT NULL,
    slug                citext NOT NULL,
    title               text NOT NULL,
    kicker              text,
    published_at        timestamptz,
    read_time_min       integer,
    is_published        boolean NOT NULL DEFAULT false,
    tags                text[] NOT NULL DEFAULT '{}',
    cover_image_url     text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (kind, slug)
);
CREATE INDEX idx_posts_kind_published     ON posts (kind, published_at DESC) WHERE is_published;
CREATE INDEX idx_posts_slug               ON posts (slug);
CREATE TRIGGER trg_posts_touch_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE post_views (
    id              bigserial PRIMARY KEY,
    post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    viewer_hash     text NOT NULL,
    user_id         uuid REFERENCES users(id) ON DELETE SET NULL,
    session_id      text,
    viewed_at       timestamptz NOT NULL DEFAULT now()
);
-- Dedup at the hour granularity (one view per (post, viewer) per hour)
CREATE UNIQUE INDEX uniq_post_views_dedup
    ON post_views (post_id, viewer_hash, (date_trunc('hour', viewed_at)));
CREATE INDEX idx_post_views_post  ON post_views (post_id);

CREATE TYPE reaction_type AS ENUM ('like', 'dislike');

CREATE TABLE post_reactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            reaction_type NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
);
CREATE INDEX idx_post_reactions_post ON post_reactions (post_id);

CREATE TABLE comments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id         uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id       uuid REFERENCES comments(id) ON DELETE CASCADE,
    body            text NOT NULL CHECK (length(body) <= 5000 AND length(body) > 0),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted_at      timestamptz
);
CREATE INDEX idx_comments_post_created ON comments (post_id, created_at);
CREATE INDEX idx_comments_user         ON comments (user_id);
CREATE TRIGGER trg_comments_touch_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE comment_reactions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id      uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            reaction_type NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (comment_id, user_id)
);

CREATE TYPE suggestion_kind   AS ENUM ('topic', 'fix', 'other');
CREATE TYPE suggestion_status AS ENUM ('new', 'read', 'archived');

CREATE TABLE suggestions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            text NOT NULL CHECK (length(body) > 0 AND length(body) <= 4000),
    kind            suggestion_kind NOT NULL DEFAULT 'other',
    status          suggestion_status NOT NULL DEFAULT 'new',
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_suggestions_status_created ON suggestions (status, created_at DESC);
CREATE TRIGGER trg_suggestions_touch_updated_at
    BEFORE UPDATE ON suggestions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- migrate:down

DROP TABLE IF EXISTS suggestions;
DROP TYPE  IF EXISTS suggestion_status;
DROP TYPE  IF EXISTS suggestion_kind;
DROP TABLE IF EXISTS comment_reactions;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS post_reactions;
DROP TYPE  IF EXISTS reaction_type;
DROP TABLE IF EXISTS post_views;
DROP TABLE IF EXISTS posts;
DROP TYPE  IF EXISTS post_kind;
