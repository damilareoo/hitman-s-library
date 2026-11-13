// app/api/checkout/route.ts
// Starts a Pro checkout for the signed-in person. Logic and tests live in
// lib/paddle/checkout.ts.
import { handleCheckout } from '@/lib/paddle/checkout'
import { createTransaction } from '@/lib/paddle/api'
import { PADDLE } from '@/lib/paddle/config'
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { hasLiveSubscription } from '@/lib/pro/live-subscription'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    return await handleCheckout(req, {
      allowed: async r => (await checkRateLimit(hashIp(clientIp(r)), 'checkout', 20, 3600)).ok,
      user: async r => { const me = await currentUser(r); return me ? { id: me.user.id, email: me.user.email, cookies: renewedCookies(r, me) } : null },
      isPro: async u => (await getEntitlement(u)).pro,
      liveSubscription: hasLiveSubscription,
      prices: PADDLE.prices,
      createTransaction,
    })
  } catch (err) {
    console.error('[POST /api/checkout]', err)
    return problem(502, 'checkout-unavailable')
  }
}
