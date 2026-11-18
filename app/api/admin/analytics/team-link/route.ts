import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { cleanTeamName } from '@/lib/beacon/parse'
import { teamSignature } from '@/lib/beacon/team'

/** A signed "this is me" link for one teammate. */
export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const { name } = await req.json().catch(() => ({}))
  const clean = cleanTeamName(name)
  if (!clean) return NextResponse.json({ error: 'Use a short name: letters, numbers, spaces.' }, { status: 400 })
  const sig = await teamSignature(clean)
  if (!sig) return NextResponse.json({ error: 'Admin secret is not configured' }, { status: 503 })
  const link = new URL(`/api/a/team?n=${encodeURIComponent(clean)}&s=${sig}`, req.nextUrl.origin).toString()
  return NextResponse.json({ link })
}
