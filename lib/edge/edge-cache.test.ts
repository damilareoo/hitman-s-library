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
