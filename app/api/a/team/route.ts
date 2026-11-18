// app/api/a/team/route.ts
// The "this is me" link. /api/a/team?n=Damilare&s=<signature> tags this
// browser as that teammate; /api/a/team?clear=1 untags it.
import { NextRequest, NextResponse } from 'next/server'
import { cleanTeamName } from '@/lib/beacon/parse'
import { TEAM_COOKIE, TEAM_MAX_AGE, teamCookieValue, teamSignature } from '@/lib/beacon/team'

export async function GET(req: NextRequest) {
  const url = req.nextUrl
  const home = new URL('/', url)
  const cookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' }

  if (url.searchParams.has('clear')) {
    const res = NextResponse.redirect(home)
    res.cookies.set(TEAM_COOKIE, '', { ...cookie, maxAge: 0 })
    return res
  }

  const name = cleanTeamName(url.searchParams.get('n'))
  const sig = url.searchParams.get('s')
  const expected = name ? await teamSignature(name) : null
  if (!name || !expected || sig !== expected) return new NextResponse('This link is not valid.', { status: 400 })

  const value = await teamCookieValue(name)
  const res = NextResponse.redirect(home)
  res.headers.set('Cache-Control', 'no-store')
  if (value) res.cookies.set(TEAM_COOKIE, value, { ...cookie, maxAge: TEAM_MAX_AGE })
  return res
}
