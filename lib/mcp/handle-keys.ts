// lib/mcp/handle-keys.ts
// /api/keys: a Pro member's keys for AI tools. GET lists them (prefix and
// dates only, never the key or its hash), POST makes one and returns it once,
// DELETE revokes one of the caller's own. Five live keys at most.
import { NO_STORE, problem, sameOriginWrite } from '@/lib/auth/request'
import { newKey, hashKey } from './keys'

export interface KeyRow { id: string; prefix: string; created_at: string; last_used_at: string | null }
export interface KeysDeps {
  user: (req: Request) => Promise<{ id: string; cookies: string[] } | null>
  isPro: (userId: string) => Promise<boolean>
  allowed: (req: Request) => Promise<boolean>
  list: (userId: string) => Promise<KeyRow[]>
  create: (userId: string, hash: string, prefix: string) => Promise<string>
  revoke: (userId: string, id: string) => Promise<boolean>
}

const MAX_KEYS = 5

export async function handleKeys(req: Request, deps: KeysDeps): Promise<Response> {
  if (req.method !== 'GET') {
    const refused = sameOriginWrite(req, { json: true })
    if (refused) return refused
    if (!(await deps.allowed(req))) return problem(429, 'rate-limited')
  }
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out')
  if (!(await deps.isPro(me.id))) return problem(402, 'pro-only', me.cookies)
  const ok = (body: unknown) => {
    const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
    for (const c of me.cookies) headers.append('Set-Cookie', c)
    return new Response(JSON.stringify(body), { headers })
  }
  if (req.method === 'GET') {
    const keys = await deps.list(me.id)
    return ok({ keys: keys.map(k => ({ id: k.id, prefix: k.prefix, created_at: k.created_at, last_used_at: k.last_used_at })) })
  }
  if (req.method === 'POST') {
    if ((await deps.list(me.id)).length >= MAX_KEYS) return problem(409, 'too-many-keys', me.cookies)
    const { key, prefix } = newKey()
    const id = await deps.create(me.id, await hashKey(key), prefix)
    return ok({ id, key, prefix })
  }
  if (req.method === 'DELETE') {
    const body = await req.json().catch(() => ({})) as { id?: unknown }
    if (typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return problem(400, 'bad-request', me.cookies)
    return (await deps.revoke(me.id, body.id)) ? ok({ ok: true }) : problem(404, 'not-found', me.cookies)
  }
  return problem(405, 'method-not-allowed', me.cookies)
}
