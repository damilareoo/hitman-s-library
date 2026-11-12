// app/api/auth/google/callback/route.ts
import { finishGoogle, linkOrCreateUser, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE } from '@/lib/auth/google'
import { createSession, sessionCookie } from '@/lib/auth/session'
import { safeNext } from '@/lib/auth/magic-link'
import { getSql } from '@/lib/db'
import { readCookie, redirectTo, tempCookie } from '@/lib/auth/request'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const clear = [OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE].map(n => tempCookie(n, '', 0))
  const state = url.searchParams.get('state') ?? ''
  const code = url.searchParams.get('code') ?? ''
  const expected = readCookie(req, OAUTH_STATE_COOKIE)
  const verifier = readCookie(req, OAUTH_VERIFIER_COOKIE)
  if (!code || !state || !expected || state !== expected || !verifier) return redirectTo(url.origin, '/?signin=invalid', clear)
  try {
    const profile = await finishGoogle(url.origin, code, verifier)
    if (!profile) return redirectTo(url.origin, '/?signin=unverified', clear)
    const userId = await linkOrCreateUser(profile, getSql())
    const { token, expiresAt } = await createSession(userId)
    const next = safeNext(readCookie(req, OAUTH_NEXT_COOKIE))
    return redirectTo(url.origin, next + (next.includes('?') ? '&' : '?') + 'signedin=1', [...clear, sessionCookie(token, expiresAt)])
  } catch (err) {
    console.error('[auth/google]', err)
    return redirectTo(url.origin, '/?signin=failed', clear)
  }
}
