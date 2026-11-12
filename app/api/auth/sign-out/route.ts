// app/api/auth/sign-out/route.ts
import { blankSessionCookie, invalidateSession } from '@/lib/auth/session'
import { currentUser, NO_STORE } from '@/lib/auth/request'

// guard: none — it only ends the caller's own session (SameSite cookies block cross-site use)
export async function POST(req: Request) {
  const me = await currentUser(req)
  if (me) await invalidateSession(me.session.id)
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', ...NO_STORE, 'Set-Cookie': blankSessionCookie() } })
}
