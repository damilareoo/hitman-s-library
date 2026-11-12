// app/api/auth/email/route.ts
// Ask for a sign-in link. Answers the same for any valid address, so it
// never reveals who has an account.
import { NextResponse } from 'next/server'
import { requestLink, defaultMagicDeps } from '@/lib/auth/magic-link'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'
import { NO_STORE } from '@/lib/auth/request'

export async function POST(req: Request) {
  const ip = await checkRateLimit(hashIp(clientIp(req)), 'signin-ip', 20, 60 * 60)
  if (!ip.ok) return NextResponse.json({ error: 'rate-limited' }, { status: 429, headers: { ...NO_STORE, 'Retry-After': String(ip.retryAfterSeconds) } })

  let body: { email?: unknown; next?: unknown } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid-request' }, { status: 400, headers: NO_STORE }) }

  const origin = new URL(req.url).origin
  const allow = async (email: string) => (await checkRateLimit(hashIp('email:' + email), 'signin-email', 5, 60 * 60)).ok
  try {
    const r = await requestLink(String(body.email ?? ''), String(body.next ?? '/'), defaultMagicDeps(origin, allow))
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.error === 'rate-limited' ? 429 : 400, headers: NO_STORE })
    return NextResponse.json({ ok: true }, { headers: NO_STORE })
  } catch (err) {
    console.error('[auth/email]', err)
    return NextResponse.json({ error: 'send-failed' }, { status: 502, headers: NO_STORE })
  }
}
