-- With no paid X API, the daily post is emailed as a draft with a one-tap
-- share link. A drafted post counts as featured, so the rotation moves on.
-- Additive only.
ALTER TABLE x_posts ADD COLUMN IF NOT EXISTS drafted boolean NOT NULL DEFAULT false;
