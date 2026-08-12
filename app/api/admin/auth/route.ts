import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isValidSession,
  sessionCookieOptions,
  timingSafeEqual,
} from '@/lib/admin-auth'

/** Exchange the passcode for a signed, httpOnly session cookie. */
export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json()
    const expected = process.env.ADMIN_PASSWORD

    if (!expected) {
      return NextResponse.json({ error: 'Admin passcode not configured' }, { status: 500 })
    }

    if (typeof passcode !== 'string' || !timingSafeEqual(passcode, expected)) {
      return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 })
    }

    const token = await createSessionToken()
    if (!token) {
      return NextResponse.json({ error: 'Admin passcode not configured' }, { status: 500 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set(ADMIN_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE))
    return res
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

/** Session check, so the admin page can restore state on load without trusting the client. */
export async function GET(req: NextRequest) {
  const authed = await isValidSession(req.cookies.get(ADMIN_COOKIE)?.value)
  return NextResponse.json({ authed }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0))
  return res
}
