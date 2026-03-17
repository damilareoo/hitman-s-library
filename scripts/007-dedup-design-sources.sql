-- 007-dedup-design-sources.sql
-- Removes duplicate design_sources rows (same source_url), keeping the one
-- with the most complete data. Adds a UNIQUE constraint to prevent future dupes.

-- Step 1: For each group of duplicates, keep the row with the most child data
-- (most colors + typography + assets combined), delete the rest.
-- Ties are broken by keeping the lowest id (oldest).

WITH ranked AS (
  SELECT
    ds.id,
    ds.source_url,
    COALESCE(c.cnt, 0) + COALESCE(t.cnt, 0) + COALESCE(a.cnt, 0) AS data_count,
    ROW_NUMBER() OVER (
      PARTITION BY ds.source_url
      ORDER BY
        COALESCE(c.cnt, 0) + COALESCE(t.cnt, 0) + COALESCE(a.cnt, 0) DESC,
        ds.id ASC
    ) AS rn
  FROM design_sources ds
  LEFT JOIN (SELECT source_id, COUNT(*) AS cnt FROM design_colors GROUP BY source_id) c ON ds.id = c.source_id
  LEFT JOIN (SELECT source_id, COUNT(*) AS cnt FROM design_typography GROUP BY source_id) t ON ds.id = t.source_id
  LEFT JOIN (SELECT source_id, COUNT(*) AS cnt FROM design_assets GROUP BY source_id) a ON ds.id = a.source_id
)
DELETE FROM design_sources
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);

-- Step 2: Add unique constraint on source_url to prevent future duplicates
-- (guard with DO block for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'design_sources_source_url_unique'
  ) THEN
    ALTER TABLE design_sources
      ADD CONSTRAINT design_sources_source_url_unique UNIQUE (source_url);
  END IF;
END$$;
