/**
 * Backfill script — populates screenshot, assets, and typography roles
 * for all existing design_sources that are missing the new data.
 *
 * Usage (with dev server running on port 3000):
 *   node scripts/backfill.mjs
 *
 * Options:
 *   BATCH_SIZE=2 node scripts/backfill.mjs   (default: 2 concurrent)
 *   DRY_RUN=1 node scripts/backfill.mjs      (just list sites, don't extract)
 */

import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env.local manually
const envPath = path.join(__dirname, '../.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const raw = trimmed.slice(idx + 1).trim()
    // Strip surrounding quotes if present
    const val = raw.replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
} catch {}

const { Client } = (await import('@neondatabase/serverless')).default ?? await import('@neondatabase/serverless')

const BASE_URL = process.env.BACKFILL_BASE_URL ?? 'http://localhost:3000'
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE ?? '2', 10)
const DRY_RUN = process.env.DRY_RUN === '1'

async function getSitesToBackfill() {
  const client = new Client(process.env.DATABASE_URL)
  await client.connect()
  try {
    // Sites that are missing screenshot OR have no assets OR have no role-aware typography
    const { rows } = await client.query(`
      SELECT DISTINCT ds.id, ds.source_url
      FROM design_sources ds
      WHERE ds.source_url IS NOT NULL
        AND ds.source_url != ''
        AND (
          ds.screenshot_url IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM design_assets da WHERE da.source_id = ds.id
          )
          OR NOT EXISTS (
            SELECT 1 FROM design_typography dt
            WHERE dt.source_id = ds.id AND dt.role IN ('heading', 'body', 'mono')
          )
        )
      ORDER BY ds.id
    `)
    return rows
  } finally {
    await client.end()
  }
}

async function reextractSite(id) {
  const res = await fetch(`${BASE_URL}/api/design/${id}/reextract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000), // 2 min timeout per site
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  return data
}

async function processBatch(batch, done, total) {
  await Promise.all(
    batch.map(async ({ id, source_url }) => {
      try {
        process.stdout.write(`  [${done}/${total}] ${source_url} ... `)
        const result = await reextractSite(id)
        console.log(`✓  (colors:${result.colors} type:${result.typography} assets:${result.assets})`)
      } catch (err) {
        console.log(`✗ ${err.message}`)
      }
      done++
    })
  )
  return done
}

async function main() {
  console.log('Fetching sites missing new extraction data...')
  const sites = await getSitesToBackfill()
  console.log(`Found ${sites.length} sites to backfill.\n`)

  if (sites.length === 0) {
    console.log('All sites already have complete data.')
    return
  }

  if (DRY_RUN) {
    sites.forEach(({ id, source_url }) => console.log(`  ${id}: ${source_url}`))
    return
  }

  console.log(`Processing in batches of ${BATCH_SIZE} (dev server: ${BASE_URL})\n`)

  let done = 1
  for (let i = 0; i < sites.length; i += BATCH_SIZE) {
    const batch = sites.slice(i, i + BATCH_SIZE)
    done = await processBatch(batch, done, sites.length) // eslint-disable-line
    // small pause between batches
    if (i + BATCH_SIZE < sites.length) {
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  console.log('\nBackfill complete.')
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
