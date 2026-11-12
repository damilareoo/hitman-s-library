// lib/auth/session.ts
//
// Sessions, following the Lucia session guide: the browser holds a random
// token; the database holds only its SHA-256, so a leaked table cannot be
// replayed as a login. 30 days, renewed when under 15 remain.
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { getSql } from '@/lib/db'

// __Host-: only this exact host can set it; the preview subdomain, which runs
// other people's scripts, cannot plant or overwrite a session.
export const SESSION_COOKIE = '__Host-hl_session'
// Readable by the page, holds no secret: it only tells the browser whether
// asking /api/me is worth a request. Signed-out visitors never make one.
export const HINT_COOKIE = 'hl_signed_in'
const DAY = 86_400_000
const LIFETIME = 30 * DAY
const RENEW_UNDER = 15 * DAY

export interface SessionUser { id: string; email: string; name: string | null; avatar_url: string | null; member_no: number; created_at: string; google: boolean }
export interface Session { id: string; userId: string; expiresAt: Date }
export interface SessionDeps { sql: NeonQueryFunction<false, false>; now: () => number }

const defaultDeps = (): SessionDeps => ({ sql: getSql(), now: Date.now })

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567'
export function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  let out = '', bits = 0, value = 0
  for (const b of bytes) {
    value = (value << 8) | b; bits += 8
    while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5 }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31]
  return out
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function createSession(userId: string, deps: SessionDeps = defaultDeps()): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken()
  const expiresAt = new Date(deps.now() + LIFETIME)
  // Sessions nobody presents again would otherwise live forever.
  await deps.sql`DELETE FROM sessions WHERE user_id = ${userId} AND expires_at < ${new Date(deps.now())}`
  await deps.sql`INSERT INTO sessions (id, user_id, expires_at) VALUES (${await hashToken(token)}, ${userId}, ${expiresAt})`
  return { token, expiresAt }
}

export async function validateSession(
  token: string,
  deps: SessionDeps = defaultDeps(),
): Promise<{ user: SessionUser; session: Session; fresh: boolean } | null> {
  if (!token) return null
  const id = await hashToken(token)
  const rows = await deps.sql`
    SELECT s.id AS session_id, s.expires_at, u.id AS user_id, u.email, u.name, u.avatar_url, u.member_no,
           u.created_at, (u.google_sub IS NOT NULL) AS google
    FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ${id}
  `
  const row: any = rows[0]
  if (!row) return null
  let expiresAt = new Date(row.expires_at)
  const now = deps.now()
  if (now >= expiresAt.getTime()) {
    await deps.sql`DELETE FROM sessions WHERE id = ${id}`
    return null
  }
  let fresh = false
  if (expiresAt.getTime() - now < RENEW_UNDER) {
    expiresAt = new Date(now + LIFETIME)
    await deps.sql`UPDATE sessions SET expires_at = ${expiresAt} WHERE id = ${id}`
    fresh = true
  }
  return {
    user: {
      id: row.user_id, email: row.email, name: row.name ?? null, avatar_url: row.avatar_url ?? null,
      member_no: Number(row.member_no), created_at: new Date(row.created_at ?? 0).toISOString(), google: Boolean(row.google),
    },
    session: { id, userId: row.user_id, expiresAt },
    fresh,
  }
}

export async function invalidateSession(sessionId: string, deps: SessionDeps = defaultDeps()): Promise<void> {
  await deps.sql`DELETE FROM sessions WHERE id = ${sessionId}`
}

export function sessionCookie(token: string, expiresAt: Date): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`
}

export function blankSessionCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

export function hintCookie(expiresAt: Date): string {
  return `${HINT_COOKIE}=1; Secure; SameSite=Lax; Path=/; Expires=${expiresAt.toUTCString()}`
}

export function blankHintCookie(): string {
  return `${HINT_COOKIE}=; Secure; SameSite=Lax; Path=/; Max-Age=0`
}

/** Both cookies for a live session, or both cleared. */
export const signedInCookies = (token: string, expiresAt: Date) => [sessionCookie(token, expiresAt), hintCookie(expiresAt)]
export const signedOutCookies = () => [blankSessionCookie(), blankHintCookie()]

/** The session token from a request's cookies, or ''. */
export function readSessionToken(req: Request): string {
  const m = /(?:^|;\s*)__Host-hl_session=([a-z2-7]+)/.exec(req.headers.get('cookie') ?? '')
  return m ? m[1] : ''
}
