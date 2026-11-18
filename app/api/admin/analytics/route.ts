import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { loadAnalytics, RANGES, type Range } from '@/lib/read/analytics'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const asked = Number(req.nextUrl.searchParams.get('days'))
  const days: Range = (RANGES as readonly number[]).includes(asked) ? (asked as Range) : 7
  try {
    return NextResponse.json(await loadAnalytics(days), { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    console.error('[analytics]', e)
    return NextResponse.json({ error: 'Could not read analytics' }, { status: 500 })
  }
}
