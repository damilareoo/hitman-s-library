-- Taste radar: weekly digest subscribers.
--
-- taste_vector is the average of the subscriber's favorited sites'
-- embeddings (609-d, same space as design_sources.embedding). favorites are
-- re-averaged on every subscribe call, so the vector tracks taste as it
-- changes. unsub_token is the only auth the unsubscribe link needs.

CREATE TABLE IF NOT EXISTS taste_subscribers (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  taste_vector vector(609),
  favorite_ids INTEGER[] NOT NULL DEFAULT '{}',
  unsub_token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ
);
