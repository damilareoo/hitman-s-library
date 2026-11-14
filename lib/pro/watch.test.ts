import { describe, expect, test } from 'bun:test'
import { handleWatch, type WatchDeps } from './watch'

const ORIGIN = 'https://hitmanslibrary.xyz'
const req = (body: unknown, origin = ORIGIN) => new Request(`${ORIGIN}/api/watch`, {
  method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', origin },
})
function deps(over: Partial<WatchDeps> = {}) {
  const calls: string[] = []
  const d: WatchDeps = {
    user: async () => ({ id: 'u1', cookies: [] }),
    isPro: async () => true,
    allowed: async () => true,
    siteExists: async id => id === 801,
    set: async (u, s, on) => { calls.push(`${u}:${s}:${on}`) },
    ...over,
  }
  return { d, calls }
}

describe('handleWatch', () => {
  test('cross-site → 403', async () => expect((await handleWatch(req({ siteId: 801, on: true }, 'https://evil.example'), deps().d)).status).toBe(403))
  test('signed out → 401', async () => expect((await handleWatch(req({ siteId: 801, on: true }), deps({ user: async () => null }).d)).status).toBe(401))
  test('free member → 402, nothing stored', async () => {
    const { d, calls } = deps({ isPro: async () => false })
    expect((await handleWatch(req({ siteId: 801, on: true }), d)).status).toBe(402)
    expect(calls).toEqual([])
  })
  test('bad or unknown site → 400/404', async () => {
    expect((await handleWatch(req({ siteId: 'x', on: true }), deps().d)).status).toBe(400)
    expect((await handleWatch(req({ siteId: 5, on: true }), deps().d)).status).toBe(404)
  })
  test('watch and unwatch', async () => {
    const { d, calls } = deps()
    expect((await handleWatch(req({ siteId: 801, on: true }), d)).status).toBe(200)
    expect((await handleWatch(req({ siteId: 801, on: false }), d)).status).toBe(200)
    expect(calls).toEqual(['u1:801:true', 'u1:801:false'])
  })
  test('rate limited → 429', async () => expect((await handleWatch(req({ siteId: 801, on: true }), deps({ allowed: async () => false }).d)).status).toBe(429))
})
