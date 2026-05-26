-- migrate:up

CREATE TABLE subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    token_hash      text NOT NULL,
    confirmed_at    timestamptz,
    unsubscribed_at timestamptz,
    source          text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_subscriptions_active ON subscriptions (email) WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL;
CREATE TRIGGER trg_subscriptions_touch_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TYPE delivery_status AS ENUM ('queued', 'sent', 'bounced', 'failed');

CREATE TABLE subscription_deliveries (
    id                  bigserial PRIMARY KEY,
    subscription_id     uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    post_id             uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    status              delivery_status NOT NULL DEFAULT 'queued',
    sent_at             timestamptz,
    error               text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    UNIQUE (subscription_id, post_id)
);
CREATE INDEX idx_subscription_deliveries_post ON subscription_deliveries (post_id, status);

-- migrate:down

DROP TABLE IF EXISTS subscription_deliveries;
DROP TYPE  IF EXISTS delivery_status;
DROP TABLE IF EXISTS subscriptions;
