// app/api/auth/google/route.ts
// Start "Continue with Google". State and the PKCE verifier ride in
// short-lived httpOnly cookies and are checked on the way back.
import { startGoogle, googleConfigured, OAUTH_STATE_COOKIE, OAUTH_VERIFIER_COOKIE, OAUTH_NEXT_COOKIE } from '@/lib/auth/google'
import { safeNext } from '@/lib/auth/magic-link'
import { redirectTo, tempCookie, NO_STORE } from '@/lib/auth/request'

export async function GET(req: Request) {
  const url = new URL(req.url)
  if (!googleConfigured()) return redirectTo(url.origin, '/?signin=unavailable')
  const { url: to, state, verifier } = startGoogle(url.origin)
  const headers = new Headers({ Location: to.toString(), ...NO_STORE })
  headers.append('Set-Cookie', tempCookie(OAUTH_STATE_COOKIE, state))
  headers.append('Set-Cookie', tempCookie(OAUTH_VERIFIER_COOKIE, verifier))
  headers.append('Set-Cookie', tempCookie(OAUTH_NEXT_COOKIE, safeNext(url.searchParams.get('next'))))
  return new Response(null, { status: 302, headers })
}
