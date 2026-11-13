// app/api/billing/portal/route.ts
// A short-lived link to Paddle's customer portal for the signed-in member's
// own subscription: update the card, see invoices, or cancel.
import { currentUser, problem, sameOriginWrite, NO_STORE } from '@/lib/auth/request'
import { getSql } from '@/lib/db'
import { portalUrl } from '@/lib/paddle/api'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  if (!(await checkRateLimit(hashIp(clientIp(req)), 'portal', 30, 3600)).ok) return problem(429, 'rate-limited')
  const me = await currentUser(req)
  if (!me) return problem(401, 'signed-out')
  const [sub] = await getSql()`SELECT provider_customer_id, provider_subscription_id FROM subscriptions WHERE user_id = ${me.user.id} AND provider = 'paddle'`
  if (!sub?.provider_customer_id) return problem(404, 'no-subscription')
  try {
    const url = await portalUrl(sub.provider_customer_id, sub.provider_subscription_id)
    return new Response(JSON.stringify({ url }), { headers: { 'content-type': 'application/json', ...NO_STORE } })
  } catch (err) {
    console.error('[billing portal]', err)
    return problem(502, 'portal-unavailable')
  }
}
