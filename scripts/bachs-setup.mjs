#!/usr/bin/env node
// scripts/bachs-setup.mjs
//
// Connects Hitman's Library Pro to Bachs, using BACHS_API_KEY from .env.local
// (sk_sandbox_… for testing, sk_live_… for real money; the key picks the API):
//   1. finds the Pro products ($5 a month, $48 a year), creating any missing
//   2. registers the webhook endpoint for subscription events (once)
//   3. stores BACHS_API_KEY, BACHS_WEBHOOK_SECRET, BACHS_PRO_MONTHLY and
//      BACHS_PRO_YEARLY as Worker secrets, piped in, never printed
// Safe to run again. Needs a key with products, webhooks, payments and
// customers access.
//
//   node scripts/bachs-setup.mjs
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split('\n')
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/)).filter(Boolean).map(m => [m[1], m[2]]))
const KEY = env.BACHS_API_KEY
if (!KEY || !/^sk_(sandbox|live)_/.test(KEY)) { console.error('Put BACHS_API_KEY=sk_sandbox_… (or sk_live_…) in .env.local first.'); process.exit(1) }
const live = KEY.startsWith('sk_live_')
const BASE = live ? 'https://api.bachs.io' : 'https://sandbox-api.bachs.io'
const HOOK = 'https://hitmanslibrary.xyz/api/bachs/webhook'
const EVENTS = ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']
const PLANS = [
  { secret: 'BACHS_PRO_MONTHLY', interval: 'month', amount: '5.00', name: "Hitman's Library Pro (monthly)" },
  { secret: 'BACHS_PRO_YEARLY', interval: 'year', amount: '48.00', name: "Hitman's Library Pro (yearly)" },
]

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { Authorization: `Bearer ${KEY}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json?.error_code ?? ''} ${json?.detail ?? ''}`.trim())
  return json
}
function store(name, value) {
  const r = spawnSync('./node_modules/.bin/wrangler', ['secret', 'put', name], { input: value, encoding: 'utf8' })
  console.log(r.status === 0 ? `  ${name} stored in the Worker` : `  ${name} NOT stored: ${(r.stderr || '').split('\n').find(Boolean) ?? 'wrangler failed'}`)
  return r.status === 0
}

console.log(`Bachs ${live ? 'LIVE' : 'sandbox'}`)

// 1. Products
const { items: products = [] } = await api('GET', '/v1/products?limit=100')
const ids = {}
for (const plan of PLANS) {
  const found = products.find(p => p.status === 'active' && p.billing_cycle?.interval === plan.interval && (p.billing_cycle?.frequency ?? 1) === 1
    && p.price?.currency === 'USD' && Number(p.price?.amount) === Number(plan.amount))
  if (found) { ids[plan.secret] = found.id; console.log(`  ${plan.interval}ly: using ${found.id} (${found.name})`); continue }
  const made = await api('POST', '/v1/products', {
    name: plan.name, description: 'Every style in the library, ready to build with.',
    price: { currency: 'USD', amount: plan.amount }, billing_cycle: { interval: plan.interval, frequency: 1 },
    metadata: { key: `hl-pro-${plan.interval}` },
  })
  ids[plan.secret] = made.id
  console.log(`  ${plan.interval}ly: created ${made.id}`)
}

// 2. Webhook endpoint (the signing secret comes back once on create, or from /secret)
let secret = null
const { items: hooks = [] } = await api('GET', '/v1/webhooks/endpoints?limit=100')
const hook = hooks.find(h => h.url === HOOK)
if (hook) {
  const missing = EVENTS.filter(e => !(hook.event_types ?? []).includes(e))
  if (missing.length) await api('PATCH', `/v1/webhooks/endpoints/${hook.endpoint_id}`, { event_types: [...new Set([...(hook.event_types ?? []), ...EVENTS])] })
  const s = await api('GET', `/v1/webhooks/endpoints/${hook.endpoint_id}/secret`)
  secret = s.signing_secret ?? s.secret ?? null
  console.log(`  webhook: already registered (${hook.endpoint_id})`)
} else {
  const made = await api('POST', '/v1/webhooks/endpoints', { name: "Hitman's Library Pro", url: HOOK, event_types: EVENTS, event_source: 'account' })
  secret = made.signing_secret ?? null
  console.log(`  webhook: registered ${made.endpoint_id}`)
}
if (!secret?.startsWith('whsec_')) { console.error('  webhook signing secret not returned; copy it from the Bachs developer portal and run: npx wrangler secret put BACHS_WEBHOOK_SECRET'); }

// 3. Worker secrets
let ok = store('BACHS_API_KEY', KEY)
if (secret?.startsWith('whsec_')) ok = store('BACHS_WEBHOOK_SECRET', secret) && ok
for (const plan of PLANS) ok = store(plan.secret, ids[plan.secret]) && ok
console.log(ok ? 'Done.' : 'Finished with errors above.')
