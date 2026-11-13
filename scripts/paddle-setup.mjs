#!/usr/bin/env node
// scripts/paddle-setup.mjs
//
// Creates (or updates) Hitman's Library Pro in Paddle: one product, a monthly
// and a yearly price, with lower prices for price groups B and C. Safe to run
// again — everything is matched by custom_data.key. Reads PADDLE_API_KEY from
// .env.local and never prints it. Sandbox unless --live.
//
//   node scripts/paddle-setup.mjs          (sandbox)
//   node scripts/paddle-setup.mjs --live   (production, once approved)
import { readFileSync } from 'node:fs'

const live = process.argv.includes('--live')
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)
const KEY = live ? env.PADDLE_API_KEY_LIVE : env.PADDLE_API_KEY
if (!KEY) { console.error(`Missing ${live ? 'PADDLE_API_KEY_LIVE' : 'PADDLE_API_KEY'} in .env.local`); process.exit(1) }
const BASE = live ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com'

// Same table the app uses (data/price-groups.ts), loaded without a TS step.
const src = readFileSync(new URL('../data/price-groups.ts', import.meta.url), 'utf8')
const list = name => [...src.match(new RegExp(`export const ${name} = \\[([^\\]]+)\\]`))[1].matchAll(/'([A-Z]{2})'/g)].map(m => m[1])
const GROUP_B = list('GROUP_B'), GROUP_C = list('GROUP_C')
const PRICES = { A: { month: 500, year: 4800 }, B: { month: 300, year: 2900 }, C: { month: 200, year: 1900 } }

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method, headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${json?.error?.code ?? ''} ${json?.error?.detail ?? ''}`)
  return json.data
}

const products = await api('GET', '/products?per_page=200')
let product = products.find(p => p.custom_data?.key === 'hl-pro')
const productBody = {
  name: "Hitman's Library Pro",
  description: 'Unlimited style kits and Pro search across the library.',
  tax_category: 'standard',
  custom_data: { key: 'hl-pro' },
}
product = product
  ? await api('PATCH', `/products/${product.id}`, { name: productBody.name, description: productBody.description })
  : await api('POST', '/products', productBody)
console.log('product', product.id)

const prices = await api('GET', `/prices?product_id=${product.id}&per_page=200`)
const out = { environment: live ? 'production' : 'sandbox', productId: product.id, prices: {} }
for (const interval of ['month', 'year']) {
  const key = `hl-pro-${interval}`
  const body = {
    description: interval === 'month' ? 'Pro, monthly' : 'Pro, yearly',
    name: interval === 'month' ? 'Monthly' : 'Yearly',
    unit_price: { amount: String(PRICES.A[interval]), currency_code: 'USD' },
    // One subscription per person: checkout shows no quantity picker.
    quantity: { minimum: 1, maximum: 1 },
    unit_price_overrides: [
      { country_codes: GROUP_B, unit_price: { amount: String(PRICES.B[interval]), currency_code: 'USD' } },
      { country_codes: GROUP_C, unit_price: { amount: String(PRICES.C[interval]), currency_code: 'USD' } },
    ],
  }
  const existing = prices.find(p => p.custom_data?.key === key)
  const price = existing
    ? await api('PATCH', `/prices/${existing.id}`, body)
    : await api('POST', '/prices', { ...body, product_id: product.id, billing_cycle: { interval, frequency: 1 }, custom_data: { key } })
  out.prices[interval] = price.id
  console.log(interval, price.id)
}
console.log(JSON.stringify(out, null, 2))
