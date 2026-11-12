// app/api/auth/email/callback/route.ts
//
// The link in the email opens a small confirmation page; only pressing its
// button signs in. Mail scanners (Safe Links and the like) fetch links before
// people do — a GET that signed in would burn the link and hand the scanner a
// session. The POST is the only thing that consumes the token.
import { consumeLink } from '@/lib/auth/magic-link'
import { createSession, hashToken, invalidateSession, readSessionToken, signedInCookies } from '@/lib/auth/session'
import { getSql } from '@/lib/db'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'
import { NO_STORE, redirectTo, sameOriginWrite } from '@/lib/auth/request'

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token') ?? ''
  if (!/^[a-z2-7]{20,64}$/.test(token)) return redirectTo(url.origin, '/?signin=invalid')
  const rows = await getSql()`SELECT email, used_at, expires_at FROM login_tokens WHERE id = ${await hashToken(token)}`
  const t = rows[0] as { email: string; used_at: string | null; expires_at: string } | undefined
  if (!t) return redirectTo(url.origin, '/?signin=invalid')
  if (t.used_at) return redirectTo(url.origin, '/?signin=used')
  if (new Date(t.expires_at).getTime() <= Date.now()) return redirectTo(url.origin, '/?signin=expired')

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Sign in · Hitman's Library</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--ink:#161615;--muted:#76746e;--line:#00000014}
@media (prefers-color-scheme:dark){:root{--bg:#111110;--ink:#f2f1ec;--muted:#8b8983;--line:#ffffff1a}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--ink);font:15px/1.45 -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:16px}
.card{width:100%;max-width:380px;border:1px solid var(--line);border-radius:22px;overflow:hidden;text-align:center}
.body{padding:36px 28px 24px}img{width:40px;height:40px;border-radius:9px}
h1{margin:20px 0 0;font-size:21px;font-weight:620;letter-spacing:-.03em}p{margin:8px 0 0;color:var(--muted)}b{color:var(--ink);font-weight:600}
button{all:unset;box-sizing:border-box;display:block;width:100%;height:52px;border-top:1px solid var(--line);font-weight:620;cursor:pointer;text-align:center}
button:hover{background:color-mix(in srgb,var(--ink) 4%,transparent)}button:focus-visible{outline:2px solid #E8A04A;outline-offset:-2px}
</style></head><body><form class="card" method="post">
<div class="body"><img src="/icon-192.png" alt=""><h1>Sign in to Hitman's Library</h1><p>as <b>${esc(t.email)}</b></p></div>
<input type="hidden" name="token" value="${token}"><button type="submit" autofocus>Continue</button>
</form></body></html>`
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', ...NO_STORE, 'Referrer-Policy': 'no-referrer' } })
}

export async function POST(req: Request) {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  const url = new URL(req.url)
  const limit = await checkRateLimit(hashIp(clientIp(req)), 'signin-confirm', 30, 60 * 60)
  if (!limit.ok) return redirectTo(url.origin, '/?signin=failed')
  const form = await req.formData().catch(() => null)
  const r = await consumeLink(String(form?.get('token') ?? ''), { sql: getSql(), now: Date.now })
  if ('error' in r) return redirectTo(url.origin, `/?signin=${r.error}`)
  // Whoever was signed in on this browser before is signed out first.
  const previous = readSessionToken(req)
  if (previous) await invalidateSession(await hashToken(previous))
  const { token, expiresAt } = await createSession(r.userId)
  return redirectTo(url.origin, r.next + (r.next.includes('?') ? '&' : '?') + 'signedin=1', signedInCookies(token, expiresAt))
}
