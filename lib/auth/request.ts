// lib/auth/request.ts
// Small helpers the auth and account routes share.
import { readSessionToken, validateSession, signedInCookies } from './session'

export const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** The signed-in person for this request, or null. Never trusts the client. */
export async function currentUser(req: Request) {
  return validateSession(readSessionToken(req))
}

/**
 * Cookies to send back when validation renewed the session, so the browser's
 * expiry moves with the database's (whichever route did the renewing).
 */
export function renewedCookies(req: Request, me: Awaited<ReturnType<typeof currentUser>>): string[] {
  return me?.fresh ? signedInCookies(readSessionToken(req), me.session.expiresAt) : []
}

/**
 * State-changing account requests must come from the site itself. SameSite
 * cookies alone aren't enough: the preview subdomain is same-site and runs
 * other people's JavaScript. JSON endpoints also refuse text/plain, which a
 * page elsewhere could send without a CORS preflight.
 */
export function sameOriginWrite(req: Request, opts: { json?: boolean } = {}): Response | null {
  const origin = req.headers.get('origin')
  if (!origin || origin !== new URL(req.url).origin) return problem(403, 'cross-origin')
  if (opts.json && !(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return problem(415, 'json-only')
  return null
}

export function problem(status: number, error: string, cookies: string[] = []): Response {
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ error }), { status, headers })
}

/** A short-lived httpOnly cookie for the OAuth round trip. */
export function tempCookie(name: string, value: string, maxAgeSeconds = 600): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
}

export function readCookie(req: Request, name: string): string {
  const m = new RegExp(`(?:^|;\\s*)${name.replace(/[-]/g, '\\-')}=([^;]*)`).exec(req.headers.get('cookie') ?? '')
  if (!m) return ''
  try { return decodeURIComponent(m[1]) } catch { return '' }
}

/** Redirect within the site, optionally setting cookies. */
export function redirectTo(origin: string, path: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: new URL(path, origin).toString(), ...NO_STORE })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(null, { status: 303, headers })
}
