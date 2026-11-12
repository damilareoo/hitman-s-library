// lib/auth/request.ts
// Small helpers the auth and account routes share.
import { readSessionToken, validateSession, sessionCookie } from './session'

export const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** The signed-in person for this request, or null. Never trusts the client. */
export async function currentUser(req: Request) {
  return validateSession(readSessionToken(req))
}

/** A short-lived httpOnly cookie for the OAuth round trip. */
export function tempCookie(name: string, value: string, maxAgeSeconds = 600): string {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`
}

export function readCookie(req: Request, name: string): string {
  const m = new RegExp(`(?:^|;\\s*)${name}=([^;]*)`).exec(req.headers.get('cookie') ?? '')
  return m ? decodeURIComponent(m[1]) : ''
}

/** Redirect within the site, optionally setting cookies. */
export function redirectTo(origin: string, path: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: new URL(path, origin).toString(), ...NO_STORE })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(null, { status: 302, headers })
}

export { sessionCookie }
