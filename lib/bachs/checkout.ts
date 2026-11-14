// lib/bachs/checkout.ts
//
// POST /api/checkout. The server creates the Bachs checkout session, carrying
// the signed-in user's id in metadata, and the browser only opens it. So the
// subscription can't be pointed at another account from the browser, and the
// product comes from our config, not the request.
import { NO_STORE, problem, sameOriginWrite } from '@/lib/auth/request'
import { isBachsCheckoutUrl } from './config'

export interface CheckoutUser { id: string; email: string; name: string | null }

export interface CheckoutDeps {
  user: (req: Request) => Promise<(CheckoutUser & { cookies: string[] }) | null>
  isPro: (userId: string) => Promise<boolean>
  /** Any subscription still alive (incl. past due): manage it, don't buy a second. */
  liveSubscription: (userId: string) => Promise<boolean>
  allowed: (req: Request) => Promise<boolean>
  /** The product ids, or null when they aren't configured. */
  products: () => { month: string; year: string } | null
  createCheckout: (productId: string, user: CheckoutUser) => Promise<string>
}

export async function handleCheckout(req: Request, deps: CheckoutDeps): Promise<Response> {
  const refused = sameOriginWrite(req, { json: true })
  if (refused) return refused
  if (!(await deps.allowed(req))) return problem(429, 'rate-limited')
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out')
  const body = await req.json().catch(() => ({})) as { interval?: unknown }
  const interval = body.interval === 'month' || body.interval === 'year' ? body.interval : null
  if (!interval) return problem(400, 'bad-interval', me.cookies)
  if (await deps.isPro(me.id)) return problem(409, 'already-pro', me.cookies)
  if (await deps.liveSubscription(me.id)) return problem(409, 'manage-billing', me.cookies)
  const products = deps.products()
  if (!products) return problem(503, 'checkout-unavailable', me.cookies)
  const checkoutUrl = await deps.createCheckout(products[interval], { id: me.id, email: me.email, name: me.name })
  if (!isBachsCheckoutUrl(checkoutUrl)) return problem(502, 'checkout-unavailable', me.cookies)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of me.cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ checkoutUrl }), { headers })
}
