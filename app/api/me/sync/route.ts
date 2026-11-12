// app/api/me/sync/route.ts
// Merge this device's hearts and collections into the account and return the
// union, which the device then adopts. Nothing anyone saved is lost.
import { getSql } from '@/lib/db'
import { checkRateLimit, hashIp } from '@/lib/rate-limit'
import { mergeUserData, sanitizeUserData } from '@/lib/auth/user-data'
import { currentUser, NO_STORE } from '@/lib/auth/request'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...NO_STORE } })

export async function POST(req: Request) {
  const me = await currentUser(req)
  if (!me) return json({ error: 'signed-out' }, 401)
  const limit = await checkRateLimit(hashIp('user:' + me.user.id), 'me-sync', 240, 60 * 60)
  if (!limit.ok) return json({ error: 'rate-limited' }, 429)

  let local
  try { local = sanitizeUserData(await req.json()) } catch { return json({ error: 'invalid-request' }, 400) }
  const sql = getSql()
  const rows = await sql`SELECT favorite_ids, collections FROM user_data WHERE user_id = ${me.user.id}`
  const merged = mergeUserData(sanitizeUserData(rows[0] ?? {}), local)
  await sql`
    INSERT INTO user_data (user_id, favorite_ids, collections, updated_at)
    VALUES (${me.user.id}, ${merged.favorite_ids}, ${JSON.stringify(merged.collections)}::jsonb, now())
    ON CONFLICT (user_id) DO UPDATE SET favorite_ids = EXCLUDED.favorite_ids, collections = EXCLUDED.collections, updated_at = now()
  `
  return json({ data: merged })
}
