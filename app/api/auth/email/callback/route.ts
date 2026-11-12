// app/api/auth/email/callback/route.ts
// The link in the email. Signs in whichever browser opens it, once.
import { consumeLink } from '@/lib/auth/magic-link'
import { createSession, sessionCookie } from '@/lib/auth/session'
import { getSql } from '@/lib/db'
import { redirectTo } from '@/lib/auth/request'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const r = await consumeLink(url.searchParams.get('token') ?? '', { sql: getSql(), now: Date.now })
  if ('error' in r) return redirectTo(url.origin, `/?signin=${r.error}`)
  const { token, expiresAt } = await createSession(r.userId)
  const next = r.next + (r.next.includes('?') ? '&' : '?') + 'signedin=1'
  return redirectTo(url.origin, next, [sessionCookie(token, expiresAt)])
}
