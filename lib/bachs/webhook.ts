// lib/bachs/webhook.ts
//
// Bachs' webhooks are the source of truth for who is Pro. Every request is
// verified: X-Bachs-Signature-V2 is "t=<unix>,v1=<hex>[,v1=<hex>]", an
// HMAC-SHA256 of "<t>.<raw body>" with the endpoint secret, no older than
// five minutes so a captured request can't be replayed. Several v1 values
// appear while a secret is being rotated; any one may match. Each event is
// applied once, and an older event never overwrites a newer one.

export interface SubscriptionRow {
  userId: string; status: string; plan: 'pro'; interval: string
  currentPeriodEnd: string | null; providerCustomerId: string; providerSubscriptionId: string
}

export interface BachsSubscription {
  subscription_id?: string
  status?: string
  customer?: { customer_id?: string } | null
  billing_cycle?: { interval?: string } | null
  current_period_end?: string | null
  metadata?: Record<string, unknown> | null
}

export interface BachsDeps {
  secret: string
  /** Seconds since the epoch. */
  now: () => number
  /** Records the event and writes the row together; false for a retry or an older event. */
  apply: (eventId: string, row: SubscriptionRow, occurredAt: string) => Promise<boolean>
  /** The welcome email for a new member. A failure never fails the webhook. */
  welcome?: (userId: string) => Promise<void>
}

const MAX_AGE_SECONDS = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SUBSCRIPTION_EVENTS = new Set(['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'])

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')

/** Constant-time compare, so the check doesn't leak how much of a guess was right. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifyBachsSignature(body: string, header: string | null, secret: string, nowSeconds: number): Promise<boolean> {
  if (!header || !secret) return false
  let t = '', sigs: string[] = []
  for (const part of header.split(',')) {
    const i = part.indexOf('='); if (i < 0) continue
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim()
    if (k === 't') t = v; else if (k === 'v1' && v) sigs.push(v.toLowerCase())
  }
  const ts = Number(t)
  if (!t || !Number.isFinite(ts) || !sigs.length || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false
  sigs = sigs.slice(0, 5)
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const want = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)))
  let ok = false
  for (const s of sigs) ok = same(want, s) || ok
  return ok
}

export function bachsRow(sub: BachsSubscription): SubscriptionRow | null {
  const userId = sub.metadata?.user_id
  if (typeof userId !== 'string' || !UUID.test(userId)) return null
  if (!sub.subscription_id || !sub.customer?.customer_id || !sub.status) return null
  return {
    userId, status: sub.status, plan: 'pro',
    interval: sub.billing_cycle?.interval === 'year' ? 'year' : 'month',
    currentPeriodEnd: sub.current_period_end ?? null,
    providerCustomerId: sub.customer.customer_id, providerSubscriptionId: sub.subscription_id,
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'Cache-Control': 'private, no-store' } })

export async function handleBachsWebhook(req: Request, deps: BachsDeps): Promise<Response> {
  const body = await req.text()
  // 400, not 401: Bachs doesn't retry a 4xx, and a forged request shouldn't be.
  if (!(await verifyBachsSignature(body, req.headers.get('x-bachs-signature-v2'), deps.secret, deps.now()))) return json(400, { error: 'bad-signature' })
  let event: { id?: string; type?: string; created_at?: string; data?: BachsSubscription }
  try { event = JSON.parse(body) } catch { return json(400, { error: 'bad-json' }) }
  if (!event.id || !event.type || !SUBSCRIPTION_EVENTS.has(event.type) || !event.data) return json(200, { ok: true, ignored: true })
  const row = bachsRow(event.data)
  if (!row) {
    console.warn('[bachs] subscription without our user id', event.data.subscription_id)
    return json(200, { ok: true, ignored: true })
  }
  const occurredAt = event.created_at && !Number.isNaN(Date.parse(event.created_at)) ? event.created_at : new Date(deps.now() * 1000).toISOString()
  const applied = await deps.apply(`bachs:${event.id}`, row, occurredAt)
  // Once per new subscription: `applied` is false for a retried event, so a retry never mails twice.
  if (applied && event.type === 'customer.subscription.created' && (row.status === 'active' || row.status === 'trialing') && deps.welcome) {
    try { await deps.welcome(row.userId) } catch (err) { console.error('[bachs] welcome email failed', err) }
  }
  return json(200, { ok: true })
}
