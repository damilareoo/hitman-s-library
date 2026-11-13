import { describe, expect, test } from 'bun:test'
import { handleCheckout, type CheckoutDeps } from './checkout'

const ORIGIN = 'https://hitmanslibrary.xyz'
const req = (body: unknown, origin: string | null = ORIGIN) => new Request(`${ORIGIN}/api/checkout`, {
  method: 'POST', body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
})
function deps(over: Partial<CheckoutDeps> = {}) {
  const created: { priceId: string; userId: string }[] = []
  const d: CheckoutDeps = {
    user: async () => ({ id: 'u1', email: 'ada@example.com', cookies: [] }),
    isPro: async () => false,
    allowed: async () => true,
    prices: { month: 'pri_m', year: 'pri_y' },
    createTransaction: async (priceId, userId) => { created.push({ priceId, userId }); return 'txn_1' },
    ...over,
  }
  return { d, created }
}

describe('handleCheckout', () => {
  test('cross-site → 403', async () => expect((await handleCheckout(req({ interval: 'year' }, 'https://evil.example'), deps().d)).status).toBe(403))
  test('signed out → 401', async () => expect((await handleCheckout(req({ interval: 'year' }), deps({ user: async () => null }).d)).status).toBe(401))
  test('already Pro → 409, no transaction', async () => {
    const { d, created } = deps({ isPro: async () => true })
    expect((await handleCheckout(req({ interval: 'year' }), d)).status).toBe(409)
    expect(created).toEqual([])
  })
  test('unknown interval → 400', async () => expect((await handleCheckout(req({ interval: 'week' }), deps().d)).status).toBe(400))
  test('rate limited → 429', async () => expect((await handleCheckout(req({ interval: 'year' }), deps({ allowed: async () => false }).d)).status).toBe(429))
  test('success: a server-made transaction for this user and price', async () => {
    const { d, created } = deps()
    const r = await handleCheckout(req({ interval: 'year' }), d)
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({ transactionId: 'txn_1', email: 'ada@example.com' })
    expect(created).toEqual([{ priceId: 'pri_y', userId: 'u1' }])
  })
})
