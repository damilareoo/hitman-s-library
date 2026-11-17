-- The daily X post. One row per post sent (or attempted), so no site is
-- featured twice in a short span and the history is one query away.
-- Additive only.
CREATE TABLE IF NOT EXISTS x_posts (
  id          serial PRIMARY KEY,
  kind        text        NOT NULL,            -- new | palette | type | week
  source_id   integer     REFERENCES design_sources(id) ON DELETE SET NULL,
  text        text        NOT NULL,
  tweet_id    text,                            -- null when the send failed
  error       text,
  posted_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS x_posts_source_idx ON x_posts (source_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS x_posts_posted_idx ON x_posts (posted_at DESC);
