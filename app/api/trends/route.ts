// app/api/trends/route.ts
// The trends report. Pro members get all of it; everyone else gets the
// headline (counts and display type) so the page can show what Pro adds.
import { NextResponse } from 'next/server'
import { currentUser, NO_STORE } from '@/lib/auth/request'
import { getEntitlement } from '@/lib/pro/entitlement'
import { trendsCached } from '@/lib/trends/load'

export async function GET(req: Request) {
  try {
    const [t, me] = await Promise.all([trendsCached(), currentUser(req)])
    const pro = me ? (await getEntitlement(me.user.id)).pro : false
    const body = pro ? { pro: true, ...t } : { pro: false, recentCount: t.recentCount, earlierCount: t.earlierCount, serif: t.serif }
    return NextResponse.json(body, { headers: NO_STORE })
  } catch (err) {
    console.error('[GET /api/trends]', err)
    return NextResponse.json({ error: 'unavailable' }, { status: 500, headers: NO_STORE })
  }
}
