-- Collections no longer ride on the digest subscriber row (migration 023).
-- That design returned saved sets to anyone who typed an email; accounts with
-- verified sessions replace it (025-accounts.sql). No code reads the column.
ALTER TABLE taste_subscribers DROP COLUMN IF EXISTS collections;
