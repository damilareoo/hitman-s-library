// lib/beacon/team.ts
// Telling your own visits apart. A teammate opens a signed link once per
// browser; it sets a long-lived cookie with their name, and every visit from
// that browser (before and after, by its visitor id) counts as theirs.
import { cleanTeamName } from './parse'

export const TEAM_COOKIE = 'hl_team'
export const TEAM_MAX_AGE = 2 * 365 * 24 * 60 * 60

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD || null
}

async function hmac(payload: string, key: string): Promise<string> {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', k, new TextEncoder().encode('team:' + payload))
  return Array.from(new Uint8Array(sig).slice(0, 12), b => b.toString(16).padStart(2, '0')).join('')
}

/** The signature a team link carries, so nobody can tag themselves as you. */
export async function teamSignature(name: string): Promise<string | null> {
  const key = secret()
  return key ? hmac(name, key) : null
}

export async function teamCookieValue(name: string): Promise<string | null> {
  const sig = await teamSignature(name)
  return sig ? `${encodeURIComponent(name)}.${sig}` : null
}

/** The teammate a request's cookie names, or null when absent or forged. */
export async function teamFromCookie(cookieHeader: string | null): Promise<string | null> {
  const raw = cookieHeader?.split(';').map(c => c.trim()).find(c => c.startsWith(TEAM_COOKIE + '='))?.slice(TEAM_COOKIE.length + 1)
  if (!raw) return null
  const value = decodeURIComponent(raw)
  const dot = value.lastIndexOf('.')
  if (dot < 1) return null
  let name: string | null
  try { name = cleanTeamName(decodeURIComponent(value.slice(0, dot))) } catch { return null }
  if (!name) return null
  const expected = await teamSignature(name)
  if (!expected || expected.length !== value.length - dot - 1) return null
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ value.charCodeAt(dot + 1 + i)
  return diff === 0 ? name : null
}
