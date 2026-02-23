-- Re-extract typography for existing designs
-- This script clears existing typography data so it can be re-extracted with the new improved detection
BEGIN;

-- Clear existing typography data so sites can be re-analyzed
DELETE FROM design_typography 
WHERE source_id IN (
  SELECT id FROM design_sources WHERE analyzed_at IS NOT NULL
);

-- Mark designs for re-analysis by clearing analyzed_at timestamp
-- This allows them to be re-extracted with improved typography detection
UPDATE design_sources 
SET analyzed_at = NULL, updated_at = NOW()
WHERE source_type = 'website' AND analyzed_at IS NOT NULL;

COMMIT;
