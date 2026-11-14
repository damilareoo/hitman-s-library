// lib/bachs/api.ts
// The two Bachs API calls the app makes, server-side with the secret key.
import { SITE_HOST } from '@/lib/digest-email'
import { bachsApiBase } from './config'
import type { CheckoutUser } from './checkout'

async function bachs<T>(path: string, body?: unknown): Promise<T> {
  const key = process.env.BACHS_API_KEY
  if (!key) throw new Error('BACHS_API_KEY is not configured')
  const res = await fetch(bachsApiBase(key) + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({})) as T & { error?: { code?: string } }
  // The status and Bachs' error code only: never the body, which may echo the email.
  if (!res.ok) throw new Error(`bachs POST ${path} → ${res.status} ${json?.error?.code ?? ''}`)
  return json
}

/** A hosted checkout for one Pro product, tied to this member by metadata.user_id. */
export async function createCheckout(productId: string, user: CheckoutUser): Promise<string> {
  const s = await bachs<{ checkout_url?: string }>('/v1/checkout-sessions', {
    product_cart: [{ product_id: productId, quantity: 1 }],
    customer: { email: user.email, name: user.name?.trim() || user.email.split('@')[0] },
    billing_currency: 'USD',
    // Bachs copies this onto the subscription; the webhook reads it back.
    metadata: { user_id: user.id },
    success_url: `${SITE_HOST}/pro?welcome=1`,
    cancel_url: `${SITE_HOST}/pro`,
  })
  if (!s.checkout_url) throw new Error('bachs checkout without a url')
  return s.checkout_url
}

/** A short-lived link to Bachs' customer portal: update the card, see invoices, or cancel. */
export async function portalUrl(customerId: string): Promise<string> {
  // No body: what the portal offers is set in Bachs' portal settings.
  const s = await bachs<{ url?: string }>(`/v1/customers/${encodeURIComponent(customerId)}/portal-sessions`)
  if (!s.url) throw new Error('bachs portal without a url')
  return s.url
}
