// lib/auth/magic-link.ts
//
// Email sign-in. A link carries a random token; the database keeps only its
// hash. Links work once and expire after 15 minutes. Opening the link signs
// that browser in, whichever device asked for it.
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { getSql } from '@/lib/db'
import { generateToken, hashToken } from './session'

const LINK_LIFETIME = 15 * 60_000

export interface MagicDeps {
  sql: NeonQueryFunction<false, false>
  now: () => number
  origin: string
  /** Rate limit for this address (and caller); false refuses. */
  allow: (email: string) => Promise<boolean>
  send: (to: string, url: string) => Promise<void>
}

/** Only same-origin paths; anything that could leave the site becomes '/'. */
export function safeNext(next: string | null | undefined): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  return next.slice(0, 500)
}

export function isEmail(email: string): boolean {
  return email.length <= 254 && /^[^\s@<>"]+@[^\s@<>"]+\.[a-z]{2,}$/i.test(email)
}

export async function requestLink(
  rawEmail: string,
  next: string,
  deps: MagicDeps,
): Promise<{ ok: true } | { ok: false; error: 'invalid-email' | 'rate-limited' }> {
  const email = rawEmail.trim().toLowerCase()
  if (!isEmail(email)) return { ok: false, error: 'invalid-email' }
  if (!(await deps.allow(email))) return { ok: false, error: 'rate-limited' }
  const token = generateToken()
  await deps.sql`INSERT INTO login_tokens (id, email, next, expires_at) VALUES (${await hashToken(token)}, ${email}, ${safeNext(next)}, ${new Date(deps.now() + LINK_LIFETIME)})`
  await deps.send(email, `${deps.origin}/api/auth/email/callback?token=${token}`)
  return { ok: true }
}

export async function consumeLink(
  token: string,
  deps: Pick<MagicDeps, 'sql' | 'now'>,
): Promise<{ userId: string; next: string } | { error: 'expired' | 'used' | 'invalid' }> {
  if (!/^[a-z2-7]{20,64}$/.test(token)) return { error: 'invalid' }
  const id = await hashToken(token)
  const now = new Date(deps.now())
  // One statement marks it used, so two clicks can never both sign in.
  const claimed = await deps.sql`
    UPDATE login_tokens SET used_at = ${now}
    WHERE id = ${id} AND used_at IS NULL AND expires_at > ${now}
    RETURNING email, next
  `
  if (!claimed.length) {
    const rows = await deps.sql`SELECT used_at, expires_at FROM login_tokens WHERE id = ${id}`
    const t: any = rows[0]
    if (!t) return { error: 'invalid' }
    return { error: t.used_at ? 'used' : 'expired' }
  }
  const { email, next } = claimed[0] as { email: string; next: string }
  const users = await deps.sql`
    INSERT INTO users (email) VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
    RETURNING id
  `
  return { userId: (users[0] as { id: string }).id, next }
}

/** The sign-in email: the lens mark, one line, one button. */
export function signInEmail(url: string): { subject: string; html: string; text: string } {
  const subject = "Sign in to Hitman's Library"
  const text = `Sign in to Hitman's Library:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`
  const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#161615">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" style="max-width:420px" cellpadding="0" cellspacing="0">
<tr><td><img src="https://hitmanslibrary.xyz/icon-192.png" width="28" height="28" alt="Hitman's Library" style="display:block;border-radius:6px"></td></tr>
<tr><td style="padding:24px 0 20px;font-size:17px;line-height:1.45">Here's your link to sign in to Hitman's Library.</td></tr>
<tr><td><a href="${url}" style="display:block;text-align:center;background:#161615;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 16px;border-radius:12px">Sign in</a></td></tr>
<tr><td style="padding-top:20px;font-size:13px;line-height:1.5;color:#76746e">It works once and expires in 15 minutes. If you didn't ask for it, ignore this email.</td></tr>
</table></td></tr></table></body></html>`
  return { subject, html, text }
}

/** Send through Resend's HTTP API (no SDK in the Worker). */
export async function sendSignInEmail(to: string, url: string): Promise<void> {
  const { subject, html, text } = signInEmail(url)
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_SIGNIN_FROM ?? "Hitman's Library <signin@hitmanslibrary.xyz>",
      to, subject, html, text,
    }),
  })
  if (!res.ok) throw new Error(`resend ${res.status}`)
}

export const defaultMagicDeps = (origin: string, allow: MagicDeps['allow']): MagicDeps => ({
  sql: getSql(), now: Date.now, origin, allow, send: sendSignInEmail,
})
