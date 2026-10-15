// scripts/backfill-capture-bytes.mjs
// Phase 2 hardening: HEAD every screenshot_url and store its Content-Length
// as design_sources.screenshot_bytes. The similar query uses it to keep
// blank captures out of neighbor candidates. Re-runnable; skips rows that
// already have a value unless --force.
//
//   node scripts/backfill-capture-bytes.mjs
//   node scripts/backfill-capture-bytes.mjs --force
import { readFileSync } from 'node:fs'
import { neon } from '@neondatabase/serverless'

const force = process.argv.includes('--force')
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')] }),
)
const sql = neon(env.DATABASE_URL_UNPOOLED || env.DATABASE_URL)

const rows = force
  ? await sql`SELECT id, screenshot_url FROM design_sources WHERE screenshot_url IS NOT NULL`
  : await sql`SELECT id, screenshot_url FROM design_sources WHERE screenshot_url IS NOT NULL AND screenshot_bytes IS NULL`
console.log(`${rows.length} captures to measure`)

let done = 0
let unknown = 0
await Promise.all(rows.map(async (r) => {
  try {
    const res = await fetch(r.screenshot_url, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    const len = parseInt(res.headers.get('content-length') ?? '', 10)
    if (Number.isFinite(len)) {
      await sql`UPDATE design_sources SET screenshot_bytes = ${len} WHERE id = ${r.id}`
      done++
    } else {
      unknown++
    }
  } catch { unknown++ }
}))
console.log(`measured: ${done}, unknown: ${unknown}`)
