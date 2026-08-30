/**
 * Create the tables behind public site requests.
 *
 *   bun run scripts/migrate-requests.ts
 *
 * Idempotent — safe to re-run.
 */
import { readFileSync } from 'fs'
import { neon } from '@neondatabase/serverless'

const env = readFileSync('.env.local', 'utf8')
const DATABASE_URL =
  process.env.DATABASE_URL ??
  env.match(/^DATABASE_URL=(.*)$/m)?.[1].trim().replace(/^["']|["']$/g, '')

if (!DATABASE_URL) throw new Error('DATABASE_URL not found')
const sql = neon(DATABASE_URL)

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS design_requests (
      id             SERIAL PRIMARY KEY,
      url            TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'pending',
      source_id      INTEGER,
      preview_title  TEXT,
      preview_image  TEXT,
      request_count  INTEGER NOT NULL DEFAULT 1,
      ip_hash        TEXT,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  // One row per site, however many people ask for it. The unique index is what
  // makes the "n people have asked for this" count possible at all.
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS design_requests_normalized_url_key ON design_requests (normalized_url)`
  await sql`CREATE INDEX IF NOT EXISTS design_requests_status_idx ON design_requests (status, created_at DESC)`

  await sql`
    CREATE TABLE IF NOT EXISTS rate_events (
      id         BIGSERIAL PRIMARY KEY,
      ip_hash    TEXT NOT NULL,
      kind       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `

  // The limiter only ever queries by (ip_hash, kind) inside a time window.
  await sql`CREATE INDEX IF NOT EXISTS rate_events_lookup_idx ON rate_events (ip_hash, kind, created_at DESC)`

  // design_sources is matched against on every preview check, and it has no index
  // for that lookup — only on the raw source_url.
  await sql`
    CREATE INDEX IF NOT EXISTS design_sources_normalized_idx
    ON design_sources (
      lower(regexp_replace(regexp_replace(source_url, '^https?://(www\\.)?', ''), '/+$', ''))
    )
  `

  const [{ requests }] = await sql`SELECT COUNT(*)::int AS requests FROM design_requests`
  const [{ events }] = await sql`SELECT COUNT(*)::int AS events FROM rate_events`
  console.log(`design_requests ready (${requests} rows), rate_events ready (${events} rows)`)
  process.exit(0)
}

main()
