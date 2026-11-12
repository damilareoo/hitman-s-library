-- Accounts: optional, created only when someone signs in.
--
-- Sessions and login tokens store a SHA-256 of the token, never the token,
-- so a database leak cannot be replayed as a login. Everything personal hangs
-- off users and goes with it on delete.

CREATE TABLE IF NOT EXISTS users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL UNIQUE CHECK (email = lower(email)),
  name        text,
  avatar_url  text,
  google_sub  text UNIQUE,
  member_no   serial UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id          text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_user_id ON sessions (user_id);

CREATE TABLE IF NOT EXISTS login_tokens (
  id          text PRIMARY KEY,
  email       text NOT NULL,
  next        text NOT NULL DEFAULT '/',
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_tokens_expires_at ON login_tokens (expires_at);

CREATE TABLE IF NOT EXISTS user_data (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  favorite_ids  int[] NOT NULL DEFAULT '{}',
  collections   jsonb NOT NULL DEFAULT '{}',
  updated_at    timestamptz NOT NULL DEFAULT now()
);
