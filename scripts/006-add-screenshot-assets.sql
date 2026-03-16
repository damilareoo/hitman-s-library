-- design_sources: full-page screenshot URL
ALTER TABLE design_sources ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- design_colors: add hex_value and oklch columns
ALTER TABLE design_colors ADD COLUMN IF NOT EXISTS hex_value TEXT;
ALTER TABLE design_colors ADD COLUMN IF NOT EXISTS oklch TEXT;

-- design_typography: add font_family and role classification columns
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS font_family TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS google_fonts_url TEXT;
ALTER TABLE design_typography ADD COLUMN IF NOT EXISTS primary_weight INTEGER;

-- Backfill role=NULL rows so unique constraint won't conflict with new inserts.
UPDATE design_typography SET role = 'legacy' WHERE role IS NULL;

-- Add unique constraint (safe because all NULLs are now backfilled)
-- IF NOT EXISTS is not valid for ADD CONSTRAINT; use DO block to guard idempotency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'design_typography_source_role_unique'
  ) THEN
    ALTER TABLE design_typography
      ADD CONSTRAINT design_typography_source_role_unique
      UNIQUE (source_id, role);
  END IF;
END$$;

-- New asset table
CREATE TABLE IF NOT EXISTS design_assets (
  id          SERIAL PRIMARY KEY,
  source_id   INTEGER NOT NULL REFERENCES design_sources(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  content     TEXT NOT NULL,
  width       INTEGER,
  height      INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS design_assets_source_id_idx ON design_assets(source_id);
