// lib/pro/watch.ts
// POST /api/watch {siteId, on}: a Pro member watches (or stops watching) a
// site, to be emailed when it redesigns. Same-origin JSON only, rate-limited,
// Pro only (402 otherwise), and only ever the caller's own watch list.
import { NO_STORE, problem, sameOriginWrite } from '@/lib/auth/request'

export interface WatchDeps {
  user: (req: Request) => Promise<{ id: string; cookies: string[] } | null>
  isPro: (userId: string) => Promise<boolean>
  allowed: (req: Request) => Promise<boolean>
  siteExists: (siteId: number) => Promise<boolean>
  set: (userId: string, siteId: number, on: boolean) => Promise<void>
}

export async function handleWatch(req: Request, deps: WatchDeps): Promise<Response> {
  const refused = sameOriginWrite(req, { json: true })
  if (refused) return refused
  if (!(await deps.allowed(req))) return problem(429, 'rate-limited')
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out')
  if (!(await deps.isPro(me.id))) return problem(402, 'pro-only', me.cookies)
  const body = await req.json().catch(() => ({})) as { siteId?: unknown; on?: unknown }
  const siteId = typeof body.siteId === 'number' && Number.isInteger(body.siteId) && body.siteId > 0 ? body.siteId : null
  if (siteId == null || typeof body.on !== 'boolean') return problem(400, 'bad-request', me.cookies)
  if (!(await deps.siteExists(siteId))) return problem(404, 'not-found', me.cookies)
  await deps.set(me.id, siteId, body.on)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of me.cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ ok: true, watching: body.on }), { headers })
}
