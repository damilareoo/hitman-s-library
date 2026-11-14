import { describe, expect, test } from 'bun:test'
import { handleKeys, type KeysDeps } from './handle-keys'

const O = 'https://hitmanslibrary.xyz'
const req = (method: string, body?: unknown, origin = O) => new Request(`${O}/api/keys`, {
  method, ...(body ? { body: JSON.stringify(body) } : {}), headers: { 'content-type': 'application/json', origin },
})
function deps(over: Partial<KeysDeps> = {}) {
  const made: string[] = [], revoked: string[] = []
  const d: KeysDeps = {
    user: async () => ({ id: 'u1', cookies: [] }),
    isPro: async () => true,
    allowed: async () => true,
    list: async () => [{ id: 'k1', prefix: 'hl_abcdef', created_at: '2026-11-14', last_used_at: null }],
    create: async (u, hash, prefix) => { made.push(`${u}:${prefix}:${hash.length}`); return 'k2' },
    revoke: async (u, id) => { revoked.push(`${u}:${id}`); return true },
    ...over,
  }
  return { d, made, revoked }
}

describe('handleKeys', () => {
  test('signed out → 401; free → 402', async () => {
    expect((await handleKeys(req('GET'), deps({ user: async () => null }).d)).status).toBe(401)
    expect((await handleKeys(req('GET'), deps({ isPro: async () => false }).d)).status).toBe(402)
  })
  test('list never includes a key or its hash', async () => {
    const r = await handleKeys(req('GET'), deps().d)
    const b = await r.json() as { keys: Record<string, unknown>[] }
    expect(Object.keys(b.keys[0]).sort()).toEqual(['created_at', 'id', 'last_used_at', 'prefix'])
  })
  test('create returns the key once, stores only a hash', async () => {
    const { d, made } = deps()
    const r = await handleKeys(req('POST', {}), d)
    const b = await r.json() as { key: string; id: string }
    expect(b.key).toMatch(/^hl_[a-z2-7]{52}$/)
    expect(made[0]).toBe(`u1:${b.key.slice(0, 9)}:64`)
  })
  test('five live keys at most', async () => {
    const five = Array.from({ length: 5 }, (_, i) => ({ id: `k${i}`, prefix: 'hl_x', created_at: '', last_used_at: null }))
    expect((await handleKeys(req('POST', {}), deps({ list: async () => five }).d)).status).toBe(409)
  })
  test('cross-site writes are refused', async () => {
    expect((await handleKeys(req('POST', {}, 'https://evil.example'), deps().d)).status).toBe(403)
    expect((await handleKeys(req('DELETE', { id: 'k1' }, 'https://evil.example'), deps().d)).status).toBe(403)
  })
  test('revoke only ever the caller\'s own key', async () => {
    const { d, revoked } = deps()
    expect((await handleKeys(req('DELETE', { id: '0f8e6c2a-1b3d-4e5f-8a9b-0c1d2e3f4a5b' }), d)).status).toBe(200)
    expect(revoked).toEqual(['u1:0f8e6c2a-1b3d-4e5f-8a9b-0c1d2e3f4a5b'])
    expect((await handleKeys(req('DELETE', { id: '9f8e6c2a-1b3d-4e5f-8a9b-0c1d2e3f4a5b' }), deps({ revoke: async () => false }).d)).status).toBe(404)
    expect((await handleKeys(req('DELETE', { id: "x' OR 1=1" }), d)).status).toBe(400)
  })
})
