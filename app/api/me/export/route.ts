// app/api/me/export/route.ts
// Everything stored about the signed-in person, as a JSON download.
import { getSql } from '@/lib/db'
import { currentUser, NO_STORE } from '@/lib/auth/request'

export async function GET(req: Request) {
  const me = await currentUser(req)
  if (!me) return new Response(JSON.stringify({ error: 'signed-out' }), { status: 401, headers: { 'content-type': 'application/json', ...NO_STORE } })
  const sql = getSql()
  const [user] = await sql`SELECT email, name, avatar_url, member_no, created_at FROM users WHERE id = ${me.user.id}`
  const [data] = await sql`SELECT favorite_ids, collections, updated_at FROM user_data WHERE user_id = ${me.user.id}`
  const subscription = await sql`SELECT status, plan, interval, current_period_end, provider, updated_at FROM subscriptions WHERE user_id = ${me.user.id}`
  const kits = await sql`SELECT source_id, month, created_at FROM kit_downloads WHERE user_id = ${me.user.id} ORDER BY created_at`
  const requests = await sql`SELECT url, email, note, credit, status, created_at FROM design_requests WHERE user_id = ${me.user.id} OR email = ${me.user.email} ORDER BY created_at`
  return new Response(JSON.stringify({ account: user, saved: data ?? null, subscription: subscription[0] ?? null, kitDownloads: kits, siteRequests: requests }, null, 2), {
    headers: { 'content-type': 'application/json', 'content-disposition': 'attachment; filename="hitmans-library-account.json"', ...NO_STORE },
  })
}
