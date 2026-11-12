import { expect, test } from 'bun:test'
import { storedHeaders, browserHeaders, STORED_AT } from './edge-cache'

test('the stored copy is kept at the edge for a day, stamped with its age', () => {
  const s = storedHeaders(new Headers({ 'cache-control': 'public, s-maxage=60', vary: 'rsc' }), 1000)
  expect(s.get('cache-control')).toBe('public, max-age=86400')
  expect(s.get(STORED_AT)).toBe('1000')
  expect(s.get('vary')).toBeNull()
})

test('browsers get the route’s own cache-control back, not the edge’s day', () => {
  const stored = storedHeaders(new Headers({ 'content-type': 'application/json', 'cache-control': 'public, s-maxage=60, stale-while-revalidate=600' }), 1)
  const b = browserHeaders(stored, 'HIT')
  expect(b.get('cache-control')).toBe('public, s-maxage=60, stale-while-revalidate=600')
  expect(b.get('x-hl-cache')).toBe('HIT')
  expect(b.get(STORED_AT)).toBeNull()
})

test('a response that had no cache-control gets none from the edge either', () => {
  const b = browserHeaders(storedHeaders(new Headers({ 'content-type': 'application/json' }), 1), 'STALE')
  expect(b.get('cache-control')).toBeNull()
})

test('HTML always revalidates in the browser', () => {
  const b = browserHeaders(storedHeaders(new Headers({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'private, no-store' }), 1), 'HIT')
  expect(b.get('cache-control')).toBe('public, max-age=0, must-revalidate')
})

test('a fresh (MISS) response passes its own headers through', () => {
  const b = browserHeaders(new Headers({ 'content-type': 'application/json', 'cache-control': 'no-store' }), 'MISS')
  expect(b.get('cache-control')).toBe('no-store')
  expect(b.get('x-hl-cache')).toBe('MISS')
})

import { cacheKind, cacheKey } from './edge-cache'

const get = (path: string, headers: Record<string, string> = {}) => {
  const url = new URL('https://hitmanslibrary.xyz' + path)
  return { req: new Request(url, { headers }), url }
}

test('pages and public reads are cacheable; private and write surfaces are not', () => {
  const k = (path: string, h?: Record<string, string>) => { const { req, url } = get(path, h); return cacheKind(req, url) }
  expect(k('/')).toBe('page')
  expect(k('/submit')).toBe('page')
  expect(k('/api/design/798')).toBe('api')
  expect(k('/admin')).toBeNull()
  expect(k('/api/request')).toBeNull()
  expect(k('/', { cookie: 'hl_admin=x' })).toBeNull()
  expect(k('/_next/static/a.js')).toBeNull()
})

test('Next navigation requests are cacheable only when they carry the _rsc key', () => {
  const k = (path: string, h: Record<string, string>) => { const { req, url } = get(path, h); return cacheKind(req, url) }
  expect(k('/about?_rsc=abc12', { rsc: '1', 'next-router-prefetch': '1' })).toBe('page')
  expect(k('/about', { rsc: '1' })).toBeNull()
})

test('navigation requests with different router headers never share a cache entry', () => {
  const key = (h: Record<string, string>) => { const { req, url } = get('/about?_rsc=abc12', h); return cacheKey(req, url, 'v1').url }
  const a = key({ rsc: '1', 'next-router-prefetch': '1' })
  const b = key({ rsc: '1', 'next-router-state-tree': '%5B%22%22%5D' })
  expect(a).not.toBe(b)
  expect(key({ rsc: '1', 'next-router-prefetch': '1' })).toBe(a)
})

test('tracking parameters share one cache entry; versions never do', () => {
  const k = (path: string, v = 'v1') => { const { req, url } = get(path); return cacheKey(req, url, v).url }
  expect(k('/?utm_source=x&b=2&a=1')).toBe(k('/?a=1&b=2'))
  expect(k('/', 'v1')).not.toBe(k('/', 'v2'))
})
