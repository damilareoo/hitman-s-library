-- Pro: subscription state (filled by payment webhooks later), the monthly
-- style-kit meter, and who sent a request (for Pro review priority).
-- Additive only. Everything personal cascades with the user on delete.

CREATE TABLE IF NOT EXISTS subscriptions (
  user_id               uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status                text NOT NULL,
  plan                  text NOT NULL,
  interval              text NOT NULL,
  current_period_end    timestamptz,
  provider              text NOT NULL,
  provider_customer_id  text,
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kit_downloads (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id   int NOT NULL,
  month       date NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month, source_id)
);

ALTER TABLE design_requests ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users(id) ON DELETE SET NULL;
