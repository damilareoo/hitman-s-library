-- Images for the daily X post: one card per site (its capture on a field of
-- its own colour), rendered ahead of time by scripts/x-card.ts on GitHub's
-- free minutes and attached by /api/cron/x-post. Additive only.
CREATE TABLE IF NOT EXISTS x_cards (
  source_id   integer PRIMARY KEY REFERENCES design_sources(id) ON DELETE CASCADE,
  image_url   text        NOT NULL,
  field_hex   text        NOT NULL,
  made_at     timestamptz NOT NULL DEFAULT now()
);
