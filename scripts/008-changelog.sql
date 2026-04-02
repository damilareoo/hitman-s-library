CREATE TABLE IF NOT EXISTS design_changelog (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER REFERENCES design_sources(id) ON DELETE SET NULL,
  source_url  TEXT NOT NULL,
  source_name TEXT NOT NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('added', 'reextracted', 'deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS design_changelog_created_at_idx ON design_changelog (created_at DESC);
