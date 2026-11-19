import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadAnalytics, RANGES, type Range, type Who } from '@/lib/read/analytics'
import { cleanTeamName } from '@/lib/beacon/parse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const asked = Number(req.nextUrl.searchParams.get('days'))
  const days: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 7
  // ?who=people (default), ?who=all, or ?who=<teammate name>
  const w = req.nextUrl.searchParams.get('who')
  const name = w && w !== 'people' && w !== 'all' ? cleanTeamName(w) : null
  const who: Who = w === 'all' ? 'all' : name ? { member: name } : 'people'
  try {
    return NextResponse.json(await loadAnalytics(days, who), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[analytics]', e)
    return NextResponse.json({ error: 'Could not read analytics' }, { status: 500 })
  }
}
