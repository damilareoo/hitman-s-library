#!/usr/bin/env node
// scripts/repair-screenshots.mjs
//
// Some extraction runs uploaded zero-byte screenshots to blob storage. They
// return HTTP 200 with an empty body, so the image optimizer answers 502 and the
// card falls back to bare text.
//
// This finds them and (with --fix) re-runs extraction for each affected site.
//
//   node scripts/repair-screenshots.mjs                  # report only
//   node scripts/repair-screenshots.mjs --fix            # re-extract broken ones
//   node scripts/repair-screenshots.mjs --fix --limit 5  # cap the work
//
// Needs DATABASE_URL, and for --fix also BASE_URL and ADMIN_PASSWORD.
import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'node:fs'

// Load .env.local without adding a dependency.
try {
  for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {}

const args = process.argv.slice(2)
const FIX = args.includes('--fix')
const LIMIT = Number(args[args.indexOf('--limit') + 1]) || Infinity
const BASE_URL = process.env.BASE_URL || 'https://www.hitmanslibrary.xyz'
const CONCURRENCY = 12

const sql = neon(process.env.DATABASE_URL)

async function byteLength(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` }
    const buf = await res.arrayBuffer()
    return { ok: buf.byteLength > 0, reason: buf.byteLength === 0 ? 'zero bytes' : null, bytes: buf.byteLength }
  } catch (err) {
    return { ok: false, reason: err.name === 'TimeoutError' ? 'timeout' : String(err.message || err) }
  }
}

async function mapLimit(items, limit, fn) {
  const out = []
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        out[i] = await fn(items[i], i)
      }
    }),
  )
  return out
}

const rows = await sql`
  SELECT id, source_name, source_url, screenshot_url
  FROM design_sources
  WHERE screenshot_url IS NOT NULL
  ORDER BY id
`

console.log(`Checking ${rows.length} screenshots…\n`)

const checked = await mapLimit(rows, CONCURRENCY, async row => {
  const result = await byteLength(row.screenshot_url)
  if (!result.ok) process.stdout.write('x')
  else process.stdout.write('.')
  return { ...row, ...result }
})

const broken = checked.filter(r => !r.ok)

console.log(`\n\n${broken.length} broken of ${rows.length}\n`)
for (const b of broken) {
  console.log(`  #${String(b.id).padEnd(5)} ${String(b.reason).padEnd(12)} ${b.source_name ?? ''} — ${b.source_url}`)
}

if (!broken.length) process.exit(0)

if (!FIX) {
  console.log('\nRe-run with --fix to re-extract these.')
  process.exit(0)
}

const passcode = process.env.ADMIN_PASSWORD
if (!passcode) {
  console.error('\nADMIN_PASSWORD is required for --fix.')
  process.exit(1)
}

const targets = broken.slice(0, LIMIT)
console.log(`\nRe-extracting ${targets.length}…\n`)

let fixed = 0
for (const b of targets) {
  process.stdout.write(`  #${b.id} ${b.source_url} … `)
  try {
    const res = await fetch(`${BASE_URL}/api/design/${b.id}/reextract`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${passcode}` },
      signal: AbortSignal.timeout(120000),
    })
    const body = await res.json().catch(() => ({}))
    if (res.ok && body.success) {
      console.log('ok')
      fixed++
    } else {
      console.log(`failed (${res.status}${body.error ? `: ${body.error}` : ''})`)
    }
  } catch (err) {
    console.log(`failed (${err.message})`)
  }
}

console.log(`\n${fixed}/${targets.length} repaired.`)
