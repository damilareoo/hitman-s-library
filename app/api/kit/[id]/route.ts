// app/api/kit/[id]/route.ts
// A site's style kit for the signed-in person, counted against the free three
// a month unless they're Pro. Logic and tests live in lib/kit/handle-kit.ts.
import { handleKit } from '@/lib/kit/handle-kit'
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getSiteDetail } from '@/lib/read/site-detail'
import { claimKit, getEntitlement } from '@/lib/pro/entitlement'

// guard: none — same-origin only, needs the caller's own session, metered per account in the database
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    return await handleKit(req, id, {
      user: async r => {
        const me = await currentUser(r)
        return me ? { id: me.user.id, cookies: renewedCookies(r, me) } : null
      },
      site: id => getSiteDetail(id),
      claim: (u, s) => claimKit(u, s),
      entitlement: u => getEntitlement(u),
    })
  } catch (err) {
    console.error('[POST /api/kit]', err)
    return problem(500, 'unavailable')
  }
}
