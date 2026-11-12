// app/api/auth/sign-out/route.ts
import { invalidateSession, signedOutCookies } from '@/lib/auth/session'
import { currentUser, NO_STORE, sameOriginWrite } from '@/lib/auth/request'

// guard: none — same-origin only, and it ends nothing but the caller's own session
export async function POST(req: Request) {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  const me = await currentUser(req)
  if (me) await invalidateSession(me.session.id)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of signedOutCookies()) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ ok: true }), { headers })
}
