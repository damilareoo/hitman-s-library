// app/api/me/route.ts
// Who is signed in, and their saved hearts and collections. Never cached;
// pages stay anonymous and the browser asks this instead.
import { getSql } from '@/lib/db'
import { signedOutCookies } from '@/lib/auth/session'
import { getEntitlement } from '@/lib/pro/entitlement'
import { currentUser, NO_STORE, problem, renewedCookies, sameOriginWrite } from '@/lib/auth/request'

function json(body: unknown, cookies: string[] = []): Response {
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of cookies) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify(body), { headers })
}

export async function GET(req: Request) {
  try {
    const me = await currentUser(req)
    // A stale hint cookie with no live session: clear it so the browser stops asking.
    if (!me) return json({ user: null }, signedOutCookies())
    const [rows, ent] = await Promise.all([
      getSql()`SELECT favorite_ids, collections FROM user_data WHERE user_id = ${me.user.id}`,
      getEntitlement(me.user.id),
    ])
    // Paddle's own customer id (never ours, never the email), for Paddle Retain.
    const [billing] = await getSql()`SELECT provider_customer_id FROM subscriptions WHERE user_id = ${me.user.id} AND provider = 'paddle'`
    const { email, name, avatar_url, member_no, created_at, google } = me.user
    return json({ user: { email, name, avatar: avatar_url, memberNo: member_no, since: created_at, google }, data: rows[0] ?? null, pro: ent.pro, kits: { used: ent.kitsUsed, limit: ent.kitsLimit }, paddleCustomerId: billing?.provider_customer_id ?? null }, renewedCookies(req, me))
  } catch (err) {
    console.error('[GET /api/me]', err)
    return problem(500, 'unavailable')
  }
}

// guard: none — same-origin only, needs the caller's own session, deletes only their account
export async function DELETE(req: Request) {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  const me = await currentUser(req)
  if (!me) return problem(401, 'signed-out', signedOutCookies())
  const sql = getSql()
  // Sessions and saved data cascade with the user row; pending links go too.
  await sql`DELETE FROM login_tokens WHERE email = ${me.user.email}`
  await sql`DELETE FROM users WHERE id = ${me.user.id}`
  return json({ ok: true }, signedOutCookies())
}
