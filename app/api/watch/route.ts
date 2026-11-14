// app/api/watch/route.ts
// Watch or unwatch a site (Pro). Logic and tests in lib/pro/watch.ts.
import { handleWatch } from '@/lib/pro/watch'
import { getSql } from '@/lib/db'
import { currentUser, problem, renewedCookies } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    return await handleWatch(req, {
      allowed: async r => (await checkRateLimit(hashIp(clientIp(r)), 'watch', 120, 3600)).ok,
      user: async r => { const me = await currentUser(r); return me ? { id: me.user.id, cookies: renewedCookies(r, me) } : null },
      isPro: async u => (await getEntitlement(u)).pro,
      siteExists: async id => (await getSql()`SELECT 1 FROM design_sources WHERE id = ${id}`).length > 0,
      set: async (u, s, on) => {
        if (on) await getSql()`INSERT INTO watches (user_id, source_id, last_alerted_extraction_id)
          SELECT ${u}::uuid, ${s}, current_extraction_id FROM design_sources WHERE id = ${s}
          ON CONFLICT DO NOTHING`
        else await getSql()`DELETE FROM watches WHERE user_id = ${u}::uuid AND source_id = ${s}`
      },
    })
  } catch (err) {
    console.error('[POST /api/watch]', err)
    return problem(500, 'unavailable')
  }
}
