-- Pro v2: watching sites for redesigns, and personal keys for AI tools.
-- Additive only.

-- A member watching a site. last_alerted_extraction_id is the snapshot they
-- were last emailed about, so one redesign never mails twice.
CREATE TABLE IF NOT EXISTS watches (
  user_id                     uuid    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id                   integer NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  last_alerted_extraction_id  integer,
  PRIMARY KEY (user_id, source_id)
);
CREATE INDEX IF NOT EXISTS watches_source_idx ON watches (source_id);

-- Personal keys for AI tools (MCP). Only a SHA-256 of the key is stored; the
-- key itself is shown once. prefix is what the member sees to tell keys apart.
CREATE TABLE IF NOT EXISTS api_keys (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash      text NOT NULL UNIQUE,
  prefix        text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys (user_id);

-- Trends briefings sent, one per member per month.
CREATE TABLE IF NOT EXISTS trend_sends (
  user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month    date NOT NULL,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month)
);
