-- migrate:up

CREATE TABLE refresh_tokens (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      text NOT NULL UNIQUE,
    family_id       uuid NOT NULL,
    expires_at      timestamptz NOT NULL,
    revoked_at      timestamptz,
    replaced_by_id  uuid REFERENCES refresh_tokens(id) ON DELETE SET NULL,
    user_agent      text,
    ip              inet,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user      ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_family    ON refresh_tokens (family_id);

CREATE TABLE email_verifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      text NOT NULL UNIQUE,
    expires_at      timestamptz NOT NULL,
    used_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_verifications_user ON email_verifications (user_id);

CREATE TABLE password_resets (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      text NOT NULL UNIQUE,
    expires_at      timestamptz NOT NULL,
    used_at         timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_resets_user     ON password_resets (user_id);

-- migrate:down

DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS refresh_tokens;
