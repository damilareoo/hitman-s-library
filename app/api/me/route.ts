// app/api/me/route.ts
// Who is signed in, and their saved hearts and collections. Never cached;
// pages stay anonymous and the browser asks this instead.
import { getSql } from '@/lib/db'
import { blankSessionCookie, readSessionToken, sessionCookie } from '@/lib/auth/session'
import { currentUser, NO_STORE } from '@/lib/auth/request'

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), { ...init, headers: { 'content-type': 'application/json', ...NO_STORE, ...(init.headers ?? {}) } })

export async function GET(req: Request) {
  const me = await currentUser(req)
  if (!me) return json({ user: null })
  const rows = await getSql()`SELECT favorite_ids, collections FROM user_data WHERE user_id = ${me.user.id}`
  const data = rows[0] ?? { favorite_ids: [], collections: {} }
  const { email, name, avatar_url, member_no } = me.user
  // A renewed session needs its cookie expiry pushed out too; the token is unchanged.
  const headers: Record<string, string> = me.fresh ? { 'Set-Cookie': sessionCookie(readSessionToken(req), me.session.expiresAt) } : {}
  return json({ user: { email, name, avatar: avatar_url, memberNo: member_no }, data }, { headers })
}

// guard: none — it requires the caller's own valid session and deletes only their account
export async function DELETE(req: Request) {
  const me = await currentUser(req)
  if (!me) return json({ error: 'signed-out' }, { status: 401 })
  // Sessions and saved data cascade with the user row.
  await getSql()`DELETE FROM users WHERE id = ${me.user.id}`
  return json({ ok: true }, { headers: { 'Set-Cookie': blankSessionCookie() } })
}
