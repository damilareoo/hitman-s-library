import { describe, expect, test } from 'bun:test'
import { handleCheckout, type CheckoutDeps } from './checkout'

const ORIGIN = 'https://hitmanslibrary.xyz'
const req = (body: unknown, origin: string | null = ORIGIN) => new Request(`${ORIGIN}/api/checkout`, {
  method: 'POST', body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}) },
})
function deps(over: Partial<CheckoutDeps> = {}) {
  const created: { productId: string; userId: string; email: string }[] = []
  const d: CheckoutDeps = {
    user: async () => ({ id: 'u1', email: 'ada@example.com', name: 'Ada', cookies: [] }),
    isPro: async () => false,
    liveSubscription: async () => false,
    allowed: async () => true,
    products: () => ({ month: 'prod_m', year: 'prod_y' }),
    createCheckout: async (productId, u) => { created.push({ productId, userId: u.id, email: u.email }); return 'https://checkout.bachs.io/c/abc' },
    ...over,
  }
  return { d, created }
}

describe('handleCheckout', () => {
  test('cross-site → 403', async () => expect((await handleCheckout(req({ interval: 'year' }, 'https://evil.example'), deps().d)).status).toBe(403))
  test('signed out → 401', async () => expect((await handleCheckout(req({ interval: 'year' }), deps({ user: async () => null }).d)).status).toBe(401))
  test('rate limited → 429', async () => expect((await handleCheckout(req({ interval: 'year' }), deps({ allowed: async () => false }).d)).status).toBe(429))
  test('unknown interval → 400', async () => expect((await handleCheckout(req({ interval: 'week' }), deps().d)).status).toBe(400))
  test('already Pro → 409, no checkout', async () => {
    const { d, created } = deps({ isPro: async () => true })
    expect((await handleCheckout(req({ interval: 'year' }), d)).status).toBe(409); expect(created).toEqual([])
  })
  test('a past-due subscription → 409 manage-billing, no second subscription', async () => {
    const { d, created } = deps({ liveSubscription: async () => true })
    const r = await handleCheckout(req({ interval: 'year' }), d)
    expect(r.status).toBe(409); expect(await r.json()).toEqual({ error: 'manage-billing' }); expect(created).toEqual([])
  })
  test('products not configured → 503, nothing created', async () => {
    const { d, created } = deps({ products: () => null })
    expect((await handleCheckout(req({ interval: 'month' }), d)).status).toBe(503); expect(created).toEqual([])
  })
  test('success: a server-made checkout for this user and product', async () => {
    const { d, created } = deps()
    const r = await handleCheckout(req({ interval: 'year' }), d)
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('private, no-store')
    expect(await r.json()).toEqual({ checkoutUrl: 'https://checkout.bachs.io/c/abc' })
    expect(created).toEqual([{ productId: 'prod_y', userId: 'u1', email: 'ada@example.com' }])
  })
  test('a checkout URL off Bachs is never handed to the browser', async () => {
    const r = await handleCheckout(req({ interval: 'month' }), deps({ createCheckout: async () => 'https://evil.example/pay' }).d)
    expect(r.status).toBe(502)
  })
})
