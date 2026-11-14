// app/api/checkout/route.ts
// Starts a Pro checkout for the signed-in person. Logic and tests live in
// lib/bachs/checkout.ts.
import { handleCheckout } from '@/lib/bachs/checkout'
import { createCheckout } from '@/lib/bachs/api'
import { bachsProducts } from '@/lib/bachs/config'
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { hasLiveSubscription } from '@/lib/pro/live-subscription'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    return await handleCheckout(req, {
      allowed: async r => (await checkRateLimit(hashIp(clientIp(r)), 'checkout', 20, 3600)).ok,
      user: async r => {
        const me = await currentUser(r)
        return me ? { id: me.user.id, email: me.user.email, name: me.user.name ?? null, cookies: renewedCookies(r, me) } : null
      },
      isPro: async u => (await getEntitlement(u)).pro,
      liveSubscription: hasLiveSubscription,
      products: () => bachsProducts(),
      createCheckout,
    })
  } catch (err) {
    console.error('[POST /api/checkout]', err)
    return problem(502, 'checkout-unavailable')
  }
}
