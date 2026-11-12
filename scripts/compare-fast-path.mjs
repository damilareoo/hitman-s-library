#!/usr/bin/env node
// scripts/compare-fast-path.mjs
//
// Proves the Worker fast path and Next answer with identical JSON. Run against
// `wrangler dev` with DEV_BYPASS=1 in .dev.vars, which lets `?__nofast=1` force
// a request through Next.
//
//   node scripts/compare-fast-path.mjs [http://localhost:8799]

import { isDeepStrictEqual } from 'node:util'

const BASE = process.argv[2] ?? 'http://localhost:8799'
const stamp = Date.now()

async function get(path) {
  const sep = path.includes('?') ? '&' : '?'
  const res = await fetch(`${BASE}${path}${sep}__c=${stamp}`)
  return {
    status: res.status,
    type: res.headers.get('content-type')?.split(';')[0],
    cache: res.headers.get('cache-control'),
    body: await res.json(),
  }
}

const newest = await get('/api/design/filter-advanced?limit=20&offset=0&sortBy=recent&__nofast=1')
const ids = newest.body.designs.map(d => d.id)
const cases = [
  ...ids.map(id => `/api/design/${id}`),
  '/api/design/filter-advanced?limit=48&offset=0&sortBy=recent',
  '/api/design/filter-advanced?limit=32&offset=32&sortBy=oldest',
  '/api/design/filter-advanced?limit=10&sortBy=name',
  '/api/design/filter-advanced?kind=Studio&limit=20',
  '/api/design/filter-advanced?search=studio&limit=20',
  '/api/design/filter-advanced?ids=798,797,1',
  '/api/design/filter-advanced?ids=1.5,3000000000',
  '/api/design/999999999',
]

let same = 0
for (const path of cases) {
  const sep = path.includes('?') ? '&' : '?'
  const [fast, next] = await Promise.all([get(path), get(`${path}${sep}__nofast=1`)])
  const ok = fast.status === next.status && fast.type === next.type && fast.cache === next.cache && isDeepStrictEqual(fast.body, next.body)
  if (ok) same++
  else console.log('DIFFERENT', path, { fast: [fast.status, fast.type, fast.cache], next: [next.status, next.type, next.cache] })
}
console.log(`${same}/${cases.length} identical`)
process.exit(same === cases.length ? 0 : 1)
