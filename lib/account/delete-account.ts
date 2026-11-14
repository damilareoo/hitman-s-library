// lib/account/delete-account.ts
// DELETE /api/me. A live subscription (active, trialing or past due) blocks
// deletion: Bachs would keep billing a person whose account no longer exists,
// and no webhook could ever find them again. They cancel first, from Manage.
import { problem, sameOriginWrite, NO_STORE } from '@/lib/auth/request'

export interface DeleteDeps {
  user: (req: Request) => Promise<{ id: string; email: string } | null>
  liveSubscription: (userId: string) => Promise<boolean>
  remove: (user: { id: string; email: string }) => Promise<void>
}

export async function handleDeleteAccount(req: Request, deps: DeleteDeps, signedOut: string[] = []): Promise<Response> {
  const refused = sameOriginWrite(req)
  if (refused) return refused
  const me = await deps.user(req)
  if (!me) return problem(401, 'signed-out', signedOut)
  if (await deps.liveSubscription(me.id)) return problem(409, 'cancel-subscription-first')
  await deps.remove(me)
  const headers = new Headers({ 'content-type': 'application/json', ...NO_STORE })
  for (const c of signedOut) headers.append('Set-Cookie', c)
  return new Response(JSON.stringify({ ok: true }), { headers })
}
