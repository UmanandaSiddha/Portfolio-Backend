-- migrate:up

CREATE TYPE user_role AS ENUM ('USER', 'OWNER');

CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    password_hash   text,
    display_name    text NOT NULL,
    role            user_role NOT NULL DEFAULT 'USER',
    avatar_url      text,
    email_verified_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role ON users (role);

CREATE TRIGGER trg_users_touch_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TYPE auth_provider AS ENUM ('PASSWORD', 'GOOGLE');

CREATE TABLE auth_providers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            auth_provider NOT NULL,
    provider_user_id    text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id),
    UNIQUE (user_id, provider)
);

CREATE INDEX idx_auth_providers_user ON auth_providers (user_id);

-- migrate:down

DROP TABLE IF EXISTS auth_providers;
DROP TYPE  IF EXISTS auth_provider;
DROP TABLE IF EXISTS users;
DROP TYPE  IF EXISTS user_role;
