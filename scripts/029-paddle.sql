-- Payments: webhook events applied once, and subscriptions tied to Paddle's
-- own ids and event times (so an older event never overwrites a newer one).
-- Additive only.

CREATE TABLE IF NOT EXISTS paddle_events (
  id           text PRIMARY KEY,
  received_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_subscription_id text;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS provider_updated_at timestamptz
