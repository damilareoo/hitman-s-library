// lib/paddle/webhook.ts
//
// Paddle's webhooks are the source of truth for who is Pro. Every request is
// verified (HMAC-SHA256 over "ts:body" with the endpoint secret, and a
// timestamp no older than five minutes, so a captured request can't be
// replayed). Each event is applied once, and an older event never overwrites
// a newer one — Paddle may retry, and may deliver out of order.

export interface PaddleSubscription {
  id: string
  status: string
  customer_id: string
  custom_data: { userId?: unknown } | null
  current_billing_period: { ends_at: string } | null
  items: { price: { billing_cycle: { interval: string } | null } }[]
}

export interface SubscriptionRow {
  userId: string; status: string; plan: 'pro'; interval: string
  currentPeriodEnd: string | null; providerCustomerId: string; providerSubscriptionId: string
}

export interface WebhookDeps {
  /** 'yes' from one of Paddle's addresses, 'no' from elsewhere, 'unknown' when the list couldn't be fetched. */
  source: (req: Request) => Promise<'yes' | 'no' | 'unknown'>
  secret: string
  now: () => number
  /**
   * Records the event and writes the row in one statement: a retried event is
   * a no-op, an older event never overwrites a newer one, and a failed write
   * leaves nothing recorded, so Paddle's retry still lands.
   */
  apply: (eventId: string, row: SubscriptionRow, occurredAt: string) => Promise<boolean>
  /** The welcome email for a new member. Optional; a failure never fails the webhook. */
  welcome?: (userId: string) => Promise<void>
}

const MAX_AGE_SECONDS = 300
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Constant-time compare, so the check doesn't leak how much of a guess was right. */
function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifySignature(body: string, header: string | null, secret: string, nowSeconds: number): Promise<boolean> {
  if (!header || !secret) return false
  const parts = Object.fromEntries(header.split(';').map(p => p.split('=') as [string, string]))
  const ts = Number(parts.ts), h1 = parts.h1
  if (!Number.isFinite(ts) || !h1 || Math.abs(nowSeconds - ts) > MAX_AGE_SECONDS) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${parts.ts}:${body}`))
  return same(hex(mac), h1)
}

export function subscriptionRow(sub: PaddleSubscription): SubscriptionRow | null {
  const userId = sub.custom_data?.userId
  if (typeof userId !== 'string' || !UUID.test(userId)) return null
  return {
    userId, status: sub.status, plan: 'pro',
    interval: sub.items?.[0]?.price?.billing_cycle?.interval ?? 'month',
    currentPeriodEnd: sub.current_billing_period?.ends_at ?? null,
    providerCustomerId: sub.customer_id, providerSubscriptionId: sub.id,
  }
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'Cache-Control': 'private, no-store' } })

export async function handleWebhook(req: Request, deps: WebhookDeps): Promise<Response> {
  const source = await deps.source(req)
  if (source === 'no') return json(403, { error: 'not-paddle' })
  // Can't check the sender right now: refuse for the moment; Paddle retries.
  if (source === 'unknown') return json(503, { error: 'try-later' })
  const body = await req.text()
  if (!(await verifySignature(body, req.headers.get('paddle-signature'), deps.secret, deps.now()))) return json(401, { error: 'bad-signature' })
  let event: { event_id?: string; event_type?: string; occurred_at?: string; data?: PaddleSubscription }
  try { event = JSON.parse(body) } catch { return json(400, { error: 'bad-json' }) }
  if (!event.event_id || !event.event_type?.startsWith('subscription.') || !event.data) return json(200, { ok: true, ignored: true })
  const row = subscriptionRow(event.data)
  if (!row) {
    console.warn('[paddle] subscription without a valid userId', event.data.id)
    return json(200, { ok: true, ignored: true })
  }
  const applied = await deps.apply(event.event_id, row, event.occurred_at ?? new Date(deps.now() * 1000).toISOString())
  // Once per new subscription: `applied` is false for a retried event, so a retry never mails twice.
  if (applied && event.event_type === 'subscription.created' && (row.status === 'active' || row.status === 'trialing') && deps.welcome) {
    try { await deps.welcome(row.userId) } catch (err) { console.error('[paddle] welcome email failed', err) }
  }
  return json(200, { ok: true })
}
