-- Submit page: a note from the maker, and who to credit.
--
-- Both optional, both single-column. The note is length-capped at 280
-- characters, the credit at 120. First submission wins on conflict — the
-- reviewer wants the maker's own words, not the loudest voter's. Batch rows
-- carry neither; they belong to the single-site form.

ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE design_requests
  ADD COLUMN IF NOT EXISTS credit TEXT;
