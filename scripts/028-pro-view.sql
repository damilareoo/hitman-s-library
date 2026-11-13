-- One definition of Pro, used by every check: an active paid subscription,
-- or a complimentary grant by email (the team, for testing). Grants are keyed
-- by email so they apply the moment that person signs up. The emails live
-- only in the database, never in the repo. Additive only.

CREATE TABLE IF NOT EXISTS comp_grants (
  email       text PRIMARY KEY CHECK (email = lower(email)),
  reason      text NOT NULL DEFAULT 'team',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE VIEW pro_users AS
  SELECT s.user_id FROM subscriptions s
   WHERE s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end > now())
  UNION
  SELECT u.id FROM users u JOIN comp_grants g ON g.email = u.email
