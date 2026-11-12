// app/api/me/sync/route.ts
//
// The first sync on a device merges its saves into the account (a union), so
// signing in never loses anything. After that the device's state replaces the
// account's, so un-hearting or deleting a set sticks.
import { getSql } from '@/lib/db'
import { checkRateLimit, hashIp } from '@/lib/rate-limit'
import { nextUserData, sanitizeUserData } from '@/lib/auth/user-data'
import { signedOutCookies } from '@/lib/auth/session'
import { currentUser, NO_STORE, problem, renewedCookies, sameOriginWrite } from '@/lib/auth/request'

export async function POST(req: Request) {
  const refused = sameOriginWrite(req, { json: true })
  if (refused) return refused
  const me = await currentUser(req)
  if (!me) return problem(401, 'signed-out', signedOutCookies())
  const limit = await checkRateLimit(hashIp('user:' + me.user.id), 'me-sync', 240, 60 * 60)
  if (!limit.ok) return problem(429, 'rate-limited')

  let body: { data?: unknown; mode?: unknown }
  try { body = await req.json() } catch { return problem(400, 'invalid-request') }
  const local = sanitizeUserData(body.data)
  const mode = body.mode === 'replace' ? 'replace' : 'merge'
  try {
    const sql = getSql()
    const rows = await sql`SELECT favorite_ids, collections FROM user_data WHERE user_id = ${me.user.id}`
    const next = nextUserData(sanitizeUserData(rows[0] ?? {}), local, mode)
    await sql`
      INSERT INTO user_data (user_id, favorite_ids, collections, updated_at)
      VALUES (${me.user.id}, ${next.favorite_ids}, ${JSON.stringify(next.collections)}::jsonb, now())
      ON CONFLICT (user_id) DO UPDATE SET favorite_ids = EXCLUDED.favorite_ids, collections = EXCLUDED.collections, updated_at = now()
    `
    const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
    for (const c of renewedCookies(req, me)) headers.append('Set-Cookie', c)
    return new Response(JSON.stringify({ data: next }), { headers })
  } catch (err) {
    console.error('[me/sync]', err)
    return problem(500, 'unavailable')
  }
}
