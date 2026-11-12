#!/usr/bin/env node
// scripts/measure-cpu.mjs
//
// Measures real Worker CPU per route on a deployed site. Opens `wrangler tail`,
// requests each route twice — once with a cache-busting param (uncached), once
// plain (served from the edge cache when warm) — then prints a markdown table
// of cpu and wall time from the tail events.
//
//   node scripts/measure-cpu.mjs [--base https://hitmanslibrary.xyz] [--out file.md]

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : fallback
}
const BASE = arg('--base', 'https://hitmanslibrary.xyz')
const OUT = arg('--out', null)

const ROUTES = [
  '/', '/about', '/changelog', '/submit', '/robots.txt', '/sitemap.xml',
  '/api/design/798', '/api/design/filter-advanced?limit=48&offset=0&sort=newest',
  '/api/design/browse-index', '/api/design/categories', '/api/changelog',
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

// wrangler tail --format json prints pretty-printed objects back to back.
function parseEvents(text) {
  const out = []
  let depth = 0, start = -1, inStr = false, esc = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') { if (depth++ === 0) start = i }
    else if (c === '}' && --depth === 0 && start >= 0) {
      try { out.push(JSON.parse(text.slice(start, i + 1))) } catch { /* partial event */ }
      start = -1
    }
  }
  return out
}

const tail = spawn('./node_modules/.bin/wrangler', ['tail', 'hitmans-library', '--format', 'json'], { stdio: ['ignore', 'pipe', 'ignore'] })
let buffer = ''
tail.stdout.on('data', d => { buffer += d })
await sleep(8000)

const stamp = Date.now()
const plan = []
for (const route of ROUTES) {
  const sep = route.includes('?') ? '&' : '?'
  plan.push({ route, state: 'uncached', url: `${BASE}${route}${sep}__m=${stamp}` })
  plan.push({ route, state: 'cached', url: `${BASE}${route}` })
}
for (const p of plan) {
  const res = await fetch(p.url, { headers: { 'user-agent': 'hl-measure' } }).catch(() => null)
  p.status = res?.status ?? 'ERR'
  p.cache = res?.headers.get('x-hl-cache') ?? ''
  await res?.arrayBuffer().catch(() => {})
}
await sleep(6000)
tail.kill()

const events = parseEvents(buffer)
const byUrl = new Map()
for (const e of events) {
  const url = e?.event?.request?.url
  if (url) byUrl.set(url, e)
}

const rows = plan.map(p => {
  const e = byUrl.get(p.url)
  return `| ${p.route} | ${p.state} | ${p.status} | ${p.cache || '-'} | ${e?.cpuTime ?? '?'} | ${e?.wallTime ?? '?'} | ${e?.outcome ?? '?'} |`
})
const table = [
  `# Worker CPU — ${new Date().toISOString()} — ${BASE}`,
  '',
  '| route | request | status | x-hl-cache | cpu ms | wall ms | outcome |',
  '|---|---|---|---|---|---|---|',
  ...rows,
  '',
].join('\n')
console.log(table)
if (OUT) writeFileSync(OUT, table)
