import { describe, expect, test } from 'bun:test'
import { handleDeleteAccount, type DeleteDeps } from './delete-account'

const ORIGIN = 'https://hitmanslibrary.xyz'
const req = (origin = ORIGIN) => new Request(`${ORIGIN}/api/me`, { method: 'DELETE', headers: { origin } })
function deps(over: Partial<DeleteDeps> = {}) {
  const removed: string[] = []
  const d: DeleteDeps = {
    user: async () => ({ id: 'u1', email: 'ada@example.com' }),
    liveSubscription: async () => false,
    remove: async u => { removed.push(u.id) },
    ...over,
  }
  return { d, removed }
}

describe('handleDeleteAccount', () => {
  test('cross-site → 403', async () => expect((await handleDeleteAccount(req('https://evil.example'), deps().d)).status).toBe(403))
  test('signed out → 401', async () => expect((await handleDeleteAccount(req(), deps({ user: async () => null }).d)).status).toBe(401))
  test('a live subscription blocks deletion, so nobody is billed for a deleted account', async () => {
    const { d, removed } = deps({ liveSubscription: async () => true })
    const r = await handleDeleteAccount(req(), d)
    expect(r.status).toBe(409)
    expect(await r.json()).toEqual({ error: 'cancel-subscription-first' })
    expect(removed).toEqual([])
  })
  test('no subscription → deleted', async () => {
    const { d, removed } = deps()
    expect((await handleDeleteAccount(req(), d)).status).toBe(200)
    expect(removed).toEqual(['u1'])
  })
})
