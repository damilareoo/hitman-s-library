// lib/paddle/checkout.ts
//
// POST /api/checkout. The server creates the Paddle transaction, carrying the
// signed-in user's id in custom_data, and the browser only opens it. So the
// subscription can't be pointed at another account from the browser, and the
// price comes from our table, not the request.
import { NO_STORE, problem, sameOriginWrite } from '@/lib/auth/request'

export interface CheckoutDeps {
  user: (req: Request) => Promise<{ id: string; email: string; cookies: string[] } | null>
  isPro: (userId: string) => Promise<boolean>
  /** Any subscription still alive at Paddle (incl. past due): manage it, don't buy a second. */
  liveSubscription: (userId: string) => Promise<boolean>
  allowed: (req: Request) => Promise<boolean>
  prices: { month: string; year: string }
  createTransaction: (priceId: string, userId: string) => Promise<string>
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
  const transactionId = await deps.createTransaction(deps.prices[interval], me.id)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of me.cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ transactionId, email: me.email }), { headers })
}
