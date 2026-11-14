// app/api/keys/route.ts
// A Pro member's keys for AI tools. Logic and tests in lib/mcp/handle-keys.ts.
import { handleKeys, type KeysDeps } from '@/lib/mcp/handle-keys'
import { getSql } from '@/lib/db'
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

function deps(): KeysDeps {
  const sql = getSql()
  return {
    allowed: async r => (await checkRateLimit(hashIp(clientIp(r)), 'keys', 30, 3600)).ok,
    user: async r => { const me = await currentUser(r); return me ? { id: me.user.id, cookies: renewedCookies(r, me) } : null },
    isPro: async u => (await getEntitlement(u)).pro,
    list: async u => (await sql`SELECT id, prefix, created_at, last_used_at FROM api_keys WHERE user_id = ${u}::uuid AND revoked_at IS NULL ORDER BY created_at`)
      .map(r => ({ id: String(r.id), prefix: String(r.prefix), created_at: new Date(r.created_at).toISOString(), last_used_at: r.last_used_at ? new Date(r.last_used_at).toISOString() : null })),
    create: async (u, hash, prefix) => String((await sql`INSERT INTO api_keys (user_id, key_hash, prefix) VALUES (${u}::uuid, ${hash}, ${prefix}) RETURNING id`)[0].id),
    revoke: async (u, id) => (await sql`UPDATE api_keys SET revoked_at = now() WHERE id = ${id}::uuid AND user_id = ${u}::uuid AND revoked_at IS NULL RETURNING 1`).length > 0,
  }
}

const run = async (req: Request) => {
  try { return await handleKeys(req, deps()) } catch (err) { console.error('[/api/keys]', err); return problem(500, 'unavailable') }
}

export async function GET(req: Request) { return run(req) }
// guard: none — same-origin JSON and rate-limited (checkRateLimit, 30/hour) inside handleKeys
export async function POST(req: Request) { return run(req) }
// guard: none — same-origin JSON and rate-limited (checkRateLimit, 30/hour) inside handleKeys
export async function DELETE(req: Request) { return run(req) }
