// lib/bachs/client.ts
// bachs.js, loaded only when someone starts a checkout, never in the main
// bundle. It opens Bachs' hosted checkout in an overlay on our page. If the
// script can't load, the caller sends the browser to the same hosted page.
'use client'

type BachsEvent = { type?: string; data?: unknown }
type BachsJs = {
  Initialize: (o: { onEvent?: (e: BachsEvent) => void }) => void
  Checkout: { open: (o: { checkoutUrl: string }) => Promise<void> | void }
}
declare global { interface Window { Bachs?: BachsJs } }

let loading: Promise<BachsJs> | null = null
const listeners = new Set<(type: string) => void>()

export function onBachsEvent(fn: (type: string) => void) { listeners.add(fn); return () => { listeners.delete(fn) } }

export function loadBachs(): Promise<BachsJs> {
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.bachs.io/bachs.js'
    s.async = true
    s.onload = () => {
      const B = window.Bachs
      if (!B) { loading = null; return reject(new Error('bachs missing')) }
      B.Initialize({ onEvent: e => { if (e?.type) listeners.forEach(l => l(e.type!)) } })
      resolve(B)
    }
    s.onerror = () => { loading = null; s.remove(); reject(new Error('bachs failed to load')) }
    document.head.appendChild(s)
  })
  return loading
}
