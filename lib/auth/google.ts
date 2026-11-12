// lib/auth/google.ts
//
// "Continue with Google": OAuth with PKCE through Arctic. Only accounts whose
// email Google has verified are accepted. A Google sign-in with an email that
// already has an account links to it instead of making a second one.
import { Google, decodeIdToken, generateCodeVerifier, generateState } from 'arctic'
import type { NeonQueryFunction } from '@neondatabase/serverless'

export const OAUTH_STATE_COOKIE = 'hl_oauth_state'
export const OAUTH_VERIFIER_COOKIE = 'hl_oauth_verifier'
export const OAUTH_NEXT_COOKIE = 'hl_oauth_next'

export interface GoogleProfile { sub: string; email: string; name: string | null; avatar: string | null }

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

export function googleClient(origin: string): Google {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${origin}/api/auth/google/callback`)
}

export function startGoogle(origin: string): { url: URL; state: string; verifier: string } {
  const state = generateState()
  const verifier = generateCodeVerifier()
  const url = googleClient(origin).createAuthorizationURL(state, verifier, ['openid', 'email', 'profile'])
  return { url, state, verifier }
}

export async function finishGoogle(origin: string, code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokens = await googleClient(origin).validateAuthorizationCode(code, verifier)
  return profileFromClaims(decodeIdToken(tokens.idToken()) as Record<string, unknown>)
}

export function profileFromClaims(claims: Record<string, unknown>): GoogleProfile | null {
  if (typeof claims.sub !== 'string' || typeof claims.email !== 'string' || claims.email_verified !== true) return null
  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === 'string' ? claims.name : null,
    avatar: typeof claims.picture === 'string' ? claims.picture : null,
  }
}

export async function linkOrCreateUser(p: GoogleProfile, sql: NeonQueryFunction<false, false>): Promise<string> {
  const byGoogle = await sql`SELECT id FROM users WHERE google_sub = ${p.sub}`
  if (byGoogle.length) return (byGoogle[0] as { id: string }).id
  // Same verified email already has an account: attach Google to it.
  const linked = await sql`
    UPDATE users SET google_sub = ${p.sub}, name = COALESCE(name, ${p.name}), avatar_url = COALESCE(avatar_url, ${p.avatar})
    WHERE email = ${p.email} AND google_sub IS NULL
    RETURNING id
  `
  if (linked.length) return (linked[0] as { id: string }).id
  const created = await sql`
    INSERT INTO users (email, name, avatar_url, google_sub) VALUES (${p.email}, ${p.name}, ${p.avatar}, ${p.sub})
    RETURNING id
  `
  return (created[0] as { id: string }).id
}
