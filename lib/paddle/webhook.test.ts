import { describe, expect, test } from 'bun:test'
import { verifySignature, subscriptionRow, handleWebhook, type WebhookDeps } from './webhook'

const SECRET = 'pdl_ntfset_test_secret'
async function sign(body: string, ts: number, secret = SECRET) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${ts}:${body}`))
  return `ts=${ts};h1=${[...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')}`
}
const NOW = 1_800_000_000
const USER = '6a1f2c3d-0000-4000-8000-000000000001'

const event = (over: Record<string, any> = {}, data: Record<string, any> = {}) => ({
  event_id: 'evt_1', event_type: 'subscription.updated', occurred_at: '2026-11-13T10:00:00Z',
  data: {
    id: 'sub_1', status: 'active', customer_id: 'ctm_1', custom_data: { userId: USER },
    current_billing_period: { starts_at: '2026-11-13T10:00:00Z', ends_at: '2026-12-13T10:00:00Z' },
    items: [{ price: { billing_cycle: { interval: 'month', frequency: 1 } } }],
    ...data,
  },
  ...over,
})

describe('verifySignature', () => {
  test('accepts a correct signature', async () => {
    const body = JSON.stringify(event())
    expect(await verifySignature(body, await sign(body, NOW), SECRET, NOW)).toBe(true)
  })
  test('rejects a changed body, a wrong secret, a stale timestamp and junk', async () => {
    const body = JSON.stringify(event())
    const header = await sign(body, NOW)
    expect(await verifySignature(body + ' ', header, SECRET, NOW)).toBe(false)
    expect(await verifySignature(body, await sign(body, NOW, 'other'), SECRET, NOW)).toBe(false)
    expect(await verifySignature(body, await sign(body, NOW - 600), SECRET, NOW)).toBe(false)
    expect(await verifySignature(body, 'nonsense', SECRET, NOW)).toBe(false)
    expect(await verifySignature(body, null, SECRET, NOW)).toBe(false)
  })
})

describe('subscriptionRow', () => {
  test('maps a Paddle subscription to our row', () => {
    expect(subscriptionRow(event().data as any)).toEqual({
      userId: USER, status: 'active', plan: 'pro', interval: 'month',
      currentPeriodEnd: '2026-12-13T10:00:00Z', providerCustomerId: 'ctm_1', providerSubscriptionId: 'sub_1',
    })
  })
  test('no or malformed userId → null', () => {
    expect(subscriptionRow({ ...event().data, custom_data: null } as any)).toBeNull()
    expect(subscriptionRow({ ...event().data, custom_data: { userId: "1; DROP TABLE users" } } as any)).toBeNull()
  })
})

function deps() {
  const seen = new Set<string>()
  const rows: any[] = []
  const welcomed: string[] = []
  const d: WebhookDeps = {
    source: async () => 'yes', secret: SECRET, now: () => NOW,
    apply: async (id, row, occurredAt) => { if (seen.has(id)) return false; seen.add(id); rows.push({ ...row, occurredAt }); return true },
    welcome: async userId => { welcomed.push(userId) },
  }
  return { d, rows, welcomed }
}
const post = async (body: string, header?: string) =>
  new Request('https://hitmanslibrary.xyz/api/paddle/webhook', { method: 'POST', body, headers: { 'paddle-signature': header ?? await sign(body, NOW) } })

describe('handleWebhook', () => {
  test('a delivery from outside Paddle\'s addresses → 403, nothing written', async () => {
    const { d, rows } = deps()
    d.source = async () => 'no'
    expect((await handleWebhook(await post(JSON.stringify(event())), d)).status).toBe(403)
    expect(rows).toEqual([])
  })
  test('if Paddle\'s address list is unavailable → 503 so Paddle retries', async () => {
    const { d, rows } = deps()
    d.source = async () => 'unknown'
    expect((await handleWebhook(await post(JSON.stringify(event())), d)).status).toBe(503)
    expect(rows).toEqual([])
  })
  test('bad signature → 401, nothing written', async () => {
    const { d, rows } = deps()
    expect((await handleWebhook(await post('{}', 'ts=1;h1=00'), d)).status).toBe(401)
    expect(rows).toEqual([])
  })
  test('a subscription event is stored once, even if Paddle retries it', async () => {
    const { d, rows } = deps()
    const body = JSON.stringify(event())
    expect((await handleWebhook(await post(body), d)).status).toBe(200)
    expect((await handleWebhook(await post(body), d)).status).toBe(200)
    expect(rows).toHaveLength(1)
    expect(rows[0].occurredAt).toBe('2026-11-13T10:00:00Z')
  })
  test('a failed write answers 500 so Paddle retries', async () => {
    const { d } = deps()
    d.apply = async () => { throw new Error('db down') }
    const r = await handleWebhook(await post(JSON.stringify(event({ event_id: 'evt_9' }))), d).catch(() => null)
    expect(r === null || r.status >= 500).toBe(true)
  })
  test('a new subscription sends the welcome email once, even if Paddle retries', async () => {
    const { d, welcomed } = deps()
    const body = JSON.stringify(event({ event_id: 'evt_new', event_type: 'subscription.created' }))
    await handleWebhook(await post(body), d); await handleWebhook(await post(body), d)
    expect(welcomed).toEqual([USER])
  })
  test('updates and cancellations send no welcome', async () => {
    const { d, welcomed } = deps()
    await handleWebhook(await post(JSON.stringify(event({ event_id: 'evt_u', event_type: 'subscription.updated' }))), d)
    await handleWebhook(await post(JSON.stringify(event({ event_id: 'evt_c', event_type: 'subscription.created' }, { status: 'canceled' }))), d)
    expect(welcomed).toEqual([])
  })
  test('a failed welcome email still answers 200', async () => {
    const { d } = deps()
    d.welcome = async () => { throw new Error('resend down') }
    expect((await handleWebhook(await post(JSON.stringify(event({ event_id: 'evt_w', event_type: 'subscription.created' }))), d)).status).toBe(200)
  })
  test('other event types are acknowledged and ignored', async () => {
    const { d, rows } = deps()
    expect((await handleWebhook(await post(JSON.stringify(event({ event_id: 'evt_2', event_type: 'transaction.paid' }))), d)).status).toBe(200)
    expect(rows).toEqual([])
  })
})
