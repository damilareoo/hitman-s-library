// lib/paddle/api.ts
// The few Paddle API calls the app makes, server-side with the secret key.
import { PADDLE_API, PADDLE_SECRETS } from './config'

async function paddle<T>(method: string, path: string, body?: unknown): Promise<T> {
  const key = process.env[PADDLE_SECRETS.apiKey]
  if (!key) throw new Error(`${PADDLE_SECRETS.apiKey} is not configured`)
  const res = await fetch(PADDLE_API + path, {
    method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({})) as { data?: T; error?: { code?: string } }
  if (!res.ok || !json.data) throw new Error(`paddle ${method} ${path} → ${res.status} ${json.error?.code ?? ''}`)
  return json.data
}

export async function createTransaction(priceId: string, userId: string): Promise<string> {
  const t = await paddle<{ id: string }>('POST', '/transactions', {
    items: [{ price_id: priceId, quantity: 1 }],
    // Paddle copies this onto the subscription; the webhook reads it back.
    custom_data: { userId },
  })
  return t.id
}

/** A short-lived link to Paddle's customer portal, to update payment or cancel. */
export async function portalUrl(customerId: string, subscriptionId: string | null): Promise<string> {
  const s = await paddle<{ urls: { general: { overview: string } } }>('POST', `/customers/${customerId}/portal-sessions`,
    subscriptionId ? { subscription_ids: [subscriptionId] } : {})
  return s.urls.general.overview
}
