// lib/paddle/client.ts
// Paddle.js, loaded only when needed (the pricing page), never in the main
// bundle. Local prices come from Paddle's price preview, which places the
// visitor by IP and applies our regional prices and their currency.
'use client'

import { PADDLE } from './config'

type PaddleJs = {
  Environment: { set: (e: string) => void }
  Initialize: (o: { token: string; eventCallback?: (e: { name?: string }) => void }) => void
  PricePreview: (o: { items: { priceId: string; quantity: number }[] }) => Promise<{
    data: { customer?: { address?: { countryCode?: string } }; address?: { countryCode?: string }; details: { lineItems: { price: { id: string }; formattedTotals: { total: string }; totals: { total: string } }[] } }
  }>
  Checkout: { open: (o: Record<string, unknown>) => void }
}
declare global { interface Window { Paddle?: PaddleJs } }

let loading: Promise<PaddleJs> | null = null
const listeners = new Set<(name: string) => void>()

export function onPaddleEvent(fn: (name: string) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export function loadPaddle(): Promise<PaddleJs> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    s.async = true
    s.onload = () => {
      const P = window.Paddle
      if (!P) return reject(new Error('paddle missing'))
      if (PADDLE.environment === 'sandbox') P.Environment.set('sandbox')
      P.Initialize({ token: PADDLE.clientToken, eventCallback: e => { if (e?.name) listeners.forEach(l => l(e.name!)) } })
      resolve(P)
    }
    s.onerror = () => { loading = null; reject(new Error('paddle failed to load')) }
    document.head.appendChild(s)
  })
  return loading
}

export interface LocalPrices { month: string; year: string; monthCents: number; yearCents: number; country: string | null }

export async function localPrices(): Promise<LocalPrices> {
  const P = await loadPaddle()
  const { data } = await P.PricePreview({ items: [{ priceId: PADDLE.prices.month, quantity: 1 }, { priceId: PADDLE.prices.year, quantity: 1 }] })
  const line = (id: string) => data.details.lineItems.find(l => l.price.id === id)!
  const m = line(PADDLE.prices.month), y = line(PADDLE.prices.year)
  return {
    month: m.formattedTotals.total, year: y.formattedTotals.total,
    monthCents: Number(m.totals.total), yearCents: Number(y.totals.total),
    country: data.address?.countryCode ?? data.customer?.address?.countryCode ?? null,
  }
}
