// lib/admin-auth.ts
// Server-side admin session. The passcode is exchanged once for a signed,
// httpOnly cookie; every mutating route verifies that cookie before running.
//
// Uses Web Crypto only, so this works unchanged on both the node and edge runtimes.
import { NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'hl_admin'

const SESSION_TTL_MS = 12 * 60 * 60 * 1000

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function sign(payload: string, key: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(payload))
  return bytesToHex(sig)
}

/** Comparison whose running time does not depend on where the first mismatch is. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/** Builds the cookie value for a fresh session. */
export async function createSessionToken(): Promise<string | null> {
  const key = secret()
  if (!key) return null
  const expires = String(Date.now() + SESSION_TTL_MS)
  return `${expires}.${await sign(expires, key)}`
}

export async function isValidSession(token: string | undefined | null): Promise<boolean> {
  if (!token) return false
  const key = secret()
  if (!key) return false

  const dot = token.lastIndexOf('.')
  if (dot < 1) return false

  const expires = token.slice(0, dot)
  const provided = token.slice(dot + 1)

  const expiresAt = Number(expires)
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false

  return timingSafeEqual(provided, await sign(expires, key))
}

export function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  }
}

export const SESSION_MAX_AGE = SESSION_TTL_MS / 1000

/**
 * Guard for mutating routes. Returns a 401 response to return early,
 * or null when the caller is an authenticated admin.
 *
 * Fails closed: with no passcode configured, nothing is callable.
 */
export async function requireAdmin(req: Request): Promise<NextResponse | null> {
  if (!secret()) {
    return NextResponse.json(
      { error: 'Admin access is not configured' },
      { status: 503 },
    )
  }

  // Cookie session (browser), or a bearer token for scripts and cron.
  const bearer = req.headers.get('authorization')
  if (bearer?.startsWith('Bearer ')) {
    const token = bearer.slice(7)
    const expected = process.env.ADMIN_PASSWORD
    if (expected && timingSafeEqual(token, expected)) return null
  }

  const cookie = req.headers
    .get('cookie')
    ?.split(';')
    .map(c => c.trim())
    .find(c => c.startsWith(`${ADMIN_COOKIE}=`))
    ?.slice(ADMIN_COOKIE.length + 1)

  if (await isValidSession(cookie ? decodeURIComponent(cookie) : null)) return null

  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
