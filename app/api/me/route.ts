// app/api/me/route.ts
// Who is signed in, and their saved hearts and collections. Never cached;
// pages stay anonymous and the browser asks this instead.
import { getSql } from '@/lib/db'
import { signedOutCookies } from '@/lib/auth/session'
import { getEntitlement } from '@/lib/pro/entitlement'
import { currentUser, NO_STORE, problem, renewedCookies } from '@/lib/auth/request'
import { handleDeleteAccount } from '@/lib/account/delete-account'
import { hasLiveSubscription } from '@/lib/pro/live-subscription'

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
    // Sites this member watches for redesigns (Pro).
    const watchRows = await getSql()`SELECT source_id FROM watches WHERE user_id = ${me.user.id}`
    const { email, name, avatar_url, member_no, created_at, google } = me.user
    return json({ user: { email, name, avatar: avatar_url, memberNo: member_no, since: created_at, google }, data: rows[0] ?? null, pro: ent.pro, paddleCustomerId: billing?.provider_customer_id ?? null, watching: watchRows.map(r => Number(r.source_id)) }, renewedCookies(req, me))
  } catch (err) {
    console.error('[GET /api/me]', err)
    return problem(500, 'unavailable')
  }
}

// guard: none — same-origin only, needs the caller's own session, deletes only their account
export async function DELETE(req: Request) {
  return handleDeleteAccount(req, {
    user: async r => { const me = await currentUser(r); return me ? { id: me.user.id, email: me.user.email } : null },
    liveSubscription: hasLiveSubscription,
    remove: async ({ id, email }) => {
      const sql = getSql()
      // Sessions, saved data and the ended subscription cascade with the user
      // row. Pending links go, and the contact email leaves any site requests.
      await sql.transaction([
        sql`DELETE FROM login_tokens WHERE email = ${email}`,
        sql`UPDATE design_requests SET email = NULL WHERE user_id = ${id} OR email = ${email}`,
        sql`DELETE FROM users WHERE id = ${id}`,
      ])
    },
  }, signedOutCookies())
}
