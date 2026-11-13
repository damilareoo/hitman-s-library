-- A day's grace past the paid period: Paddle charges at the period end and
-- the renewal webhook lands after, so without it every renewal could drop Pro
-- for a moment. Same rule as isPro (lib/pro/entitlement.ts). Additive only.
--
-- Comp grants stay keyed by email. Both current grants are gmail.com
-- addresses, where Google is authoritative for the address, so a Google
-- sign-in can't claim them. A grant for any other domain should be keyed to
-- the member's user id instead.

CREATE OR REPLACE VIEW pro_users AS
  SELECT s.user_id FROM subscriptions s
   WHERE s.status IN ('active', 'trialing') AND (s.current_period_end IS NULL OR s.current_period_end + interval '1 day' > now())
  UNION
  SELECT u.id FROM users u JOIN comp_grants g ON g.email = u.email
