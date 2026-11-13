import { describe, expect, test } from 'bun:test'
import { handleProSearch, type SearchDeps } from './handle'

const INDEX = [{ id: 1, colors: ['#ffffff', '#ff5526'], fonts: ['Inter'], contrast: 3 }, { id: 2, colors: ['#ffffff', '#000000'], fonts: ['Inter'], contrast: 21 }]
const deps = (over: Partial<SearchDeps> = {}): SearchDeps => ({
  user: async () => ({ id: 'u', cookies: [] }), isPro: async () => true, index: async () => INDEX, ...over,
})
const req = (qs: string) => new Request('https://hitmanslibrary.xyz/api/search/pro?' + qs)

describe('handleProSearch', () => {
  test('signed out → 401', async () => expect((await handleProSearch(req('font=inter'), deps({ user: async () => null }))).status).toBe(401))
  test('free account → 402 pro', async () => {
    const r = await handleProSearch(req('font=inter'), deps({ isPro: async () => false }))
    expect(r.status).toBe(402)
    expect(await r.json()).toEqual({ error: 'pro' })
  })
  test('an empty query → 400', async () => expect((await handleProSearch(req(''), deps())).status).toBe(400))
  test('Pro → ranked ids, never cached', async () => {
    const r = await handleProSearch(req('contrast=AA'), deps())
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({ ids: [2], total: 1 })
  })
})
