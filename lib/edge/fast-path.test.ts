import { describe, expect, test } from 'bun:test'
import { matchFastPath, parseListQuery } from './fast-path'

const u = (path: string) => new URL('https://hitmanslibrary.xyz' + path)

describe('matchFastPath', () => {
  test('a numeric site id is a site route', () => {
    expect(matchFastPath('GET', u('/api/design/798'))).toEqual({ kind: 'site', id: 798 })
  })
  test('a partial number is left to Next, which answers 400', () => {
    expect(matchFastPath('GET', u('/api/design/12abc'))).toBeNull()
  })
  test('an id beyond a safe integer is left to Next', () => {
    expect(matchFastPath('GET', u('/api/design/99999999999999999999'))).toBeNull()
  })
  test('writes never take the fast path', () => {
    expect(matchFastPath('PATCH', u('/api/design/798'))).toBeNull()
  })
  test('sub-resources of a site are not the site route', () => {
    expect(matchFastPath('GET', u('/api/design/798/history'))).toBeNull()
  })
  test('the filtered list is a list route', () => {
    const r = matchFastPath('GET', u('/api/design/filter-advanced?limit=48&offset=0&sortBy=recent'))
    expect(r?.kind).toBe('list')
    if (r?.kind === 'list') {
      expect(r.query.limit).toBe(48)
      expect(r.query.offset).toBe(0)
      expect(r.query.sortBy).toBe('recent')
    }
  })
  test('other design routes are not fast-pathed', () => {
    expect(matchFastPath('GET', u('/api/design/browse-index'))).toBeNull()
  })
})

describe('parseListQuery (same rules as the live route)', () => {
  const p = (qs: string) => parseListQuery(new URLSearchParams(qs))
  test('limit defaults to 32 and clamps to 1..100', () => {
    expect(p('').limit).toBe(32)
    expect(p('limit=0').limit).toBe(1)
    expect(p('limit=10000').limit).toBe(100)
    expect(p('limit=-5').limit).toBe(1)
  })
  test('offset clamps to 0..100000', () => {
    expect(p('offset=-3').offset).toBe(0)
    expect(p('offset=999999').offset).toBe(100000)
  })
  test('unknown sort falls back to recent', () => {
    expect(p('sortBy=wat').sortBy).toBe('recent')
    expect(p('sortBy=name').sortBy).toBe('name')
  })
  test('ids drop empties and non-numbers and cap at 200', () => {
    expect(p('ids=').ids).toEqual([])
    expect(p('ids=1,,x,3').ids).toEqual([1, 3])
    expect(p('ids=' + Array.from({ length: 250 }, (_, i) => i + 1).join(',')).ids.length).toBe(200)
  })
  test('kind and tag repeat; search defaults to empty', () => {
    const q = p('kind=Studio&kind=SaaS&tag=dark')
    expect(q.kinds).toEqual(['Studio', 'SaaS'])
    expect(q.tags).toEqual(['dark'])
    expect(q.search).toBe('')
  })
})
