import { describe, expect, test } from 'bun:test'
import { verifyBachsSignature, bachsRow, handleBachsWebhook, type BachsDeps } from './webhook'

const SECRET = 'whsec_test'
const NOW = 1_800_000_000
const UID = '0f8e6c2a-1b3d-4e5f-8a9b-0c1d2e3f4a5b'
async function sign(body: string, t = NOW, secret = SECRET) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`))
  return `t=${t},v1=${[...new Uint8Array(mac)].map(b => b.toString(16).padStart(2, '0')).join('')}`
}
const event = (type: string, status = 'active', extra: Record<string, unknown> = {}) => JSON.stringify({
  id: 'evt_1', type, created_at: '2026-11-14T10:00:00.000000+00:00',
  data: { subscription_id: 'sub_1', customer: { customer_id: 'cust_1', email: 'a@b.c' }, product_id: 'prod_m', status,
    billing_cycle: { interval: 'month', frequency: 1 }, current_period_end: '2026-12-14T10:00:00Z', cancel_at_period_end: false, metadata: { user_id: UID }, ...extra },
})
const req = (body: string, sig: string | null) => new Request('https://hitmanslibrary.xyz/api/bachs/webhook', { method: 'POST', body, headers: sig ? { 'x-bachs-signature-v2': sig } : {} })
function deps(over: Partial<BachsDeps> = {}) {
  const applied: unknown[] = [], welcomed: string[] = []
  const d: BachsDeps = { secret: SECRET, now: () => NOW, apply: async (id, row, at) => { applied.push({ id, row, at }); return true }, welcome: async u => { welcomed.push(u) }, ...over }
  return { d, applied, welcomed }
}

describe('verifyBachsSignature', () => {
  test('a correct v2 signature passes', async () => { const b = event('customer.subscription.created'); expect(await verifyBachsSignature(b, await sign(b), SECRET, NOW)).toBe(true) })
  test('a tampered body fails', async () => { const b = event('customer.subscription.created'); expect(await verifyBachsSignature(b + ' ', await sign(b), SECRET, NOW)).toBe(false) })
  test('older than five minutes fails', async () => { const b = event('x'); expect(await verifyBachsSignature(b, await sign(b, NOW - 301), SECRET, NOW)).toBe(false) })
  test('during a secret rotation, any listed v1 may match', async () => {
    const b = event('x'); const good = await sign(b); const other = (await sign(b, NOW, 'old')).split(',')[1]
    expect(await verifyBachsSignature(b, `t=${NOW},${other},${good.split(',')[1]}`, SECRET, NOW)).toBe(true)
  })
  test('no secret, no header: fails closed', async () => { expect(await verifyBachsSignature('{}', null, SECRET, NOW)).toBe(false); expect(await verifyBachsSignature('{}', 't=1,v1=a', '', NOW)).toBe(false) })
})

describe('bachsRow', () => {
  test('maps a subscription to our row', () => {
    expect(bachsRow(JSON.parse(event('x', 'trialing')).data)).toEqual({ userId: UID, status: 'trialing', plan: 'pro', interval: 'month', currentPeriodEnd: '2026-12-14T10:00:00Z', providerCustomerId: 'cust_1', providerSubscriptionId: 'sub_1' })
  })
  test('a subscription without our user id is ignored', () => expect(bachsRow({ ...JSON.parse(event('x')).data, metadata: {} })).toBeNull())
})

describe('handleBachsWebhook', () => {
  test('bad signature → 400, nothing applied', async () => {
    const { d, applied } = deps(); const b = event('customer.subscription.created')
    expect((await handleBachsWebhook(req(b, 't=1,v1=bad'), d)).status).toBe(400); expect(applied).toEqual([])
  })
  test('created + active: applied with provider time, and welcomed once', async () => {
    const { d, applied, welcomed } = deps(); const b = event('customer.subscription.created')
    expect((await handleBachsWebhook(req(b, await sign(b)), d)).status).toBe(200)
    expect(applied).toHaveLength(1); expect(welcomed).toEqual([UID])
  })
  test('a retried event (apply says not new) does not welcome again', async () => {
    const { d, welcomed } = deps({ apply: async () => false }); const b = event('customer.subscription.created')
    await handleBachsWebhook(req(b, await sign(b)), d); expect(welcomed).toEqual([])
  })
  test('updated and deleted apply without a welcome', async () => {
    for (const type of ['customer.subscription.updated', 'customer.subscription.deleted']) {
      const { d, applied, welcomed } = deps(); const b = event(type, type.endsWith('deleted') ? 'canceled' : 'past_due')
      expect((await handleBachsWebhook(req(b, await sign(b)), d)).status).toBe(200); expect(applied).toHaveLength(1); expect(welcomed).toEqual([])
    }
  })
  test('other events are acknowledged and ignored', async () => {
    const { d, applied } = deps(); const b = event('invoice.paid')
    expect((await handleBachsWebhook(req(b, await sign(b)), d)).status).toBe(200); expect(applied).toEqual([])
  })
})
