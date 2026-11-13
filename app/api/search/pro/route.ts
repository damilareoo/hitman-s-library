// app/api/search/pro/route.ts
// Pro search: palette, font and contrast, for signed-in Pro members, checked
// here on the server. Logic and tests live in lib/search/handle.ts.
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { handleProSearch } from '@/lib/search/handle'
import { searchIndexCached } from '@/lib/search/load'

export async function GET(req: Request) {
  try {
    return await handleProSearch(req, {
      user: async r => { const me = await currentUser(r); return me ? { id: me.user.id, cookies: renewedCookies(r, me) } : null },
      isPro: async u => (await getEntitlement(u)).pro,
      index: () => searchIndexCached(),
    })
  } catch (err) {
    console.error('[GET /api/search/pro]', err)
    return problem(500, 'unavailable')
  }
}
