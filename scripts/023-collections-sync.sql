-- Collections sync: sets ride on the subscriber row.
--
-- subscribe merges the device's map into this column (union per set name)
-- and returns the merged map for the device to adopt. No login, no token
-- dance: claiming an email routes its digest there, so abuse is visible to
-- the address owner.

ALTER TABLE taste_subscribers
  ADD COLUMN IF NOT EXISTS collections JSONB NOT NULL DEFAULT '{}';
