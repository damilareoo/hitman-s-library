import { NextRequest, NextResponse } from 'next/server'
import {
  ADMIN_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  isValidSession,
  sessionCookieOptions,
  timingSafeEqual,
} from '@/lib/admin-auth'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

/** Exchange the passcode for a signed, httpOnly session cookie. */
export async function POST(req: NextRequest) {
  // Ten tries per quarter hour per address: plenty for a person, useless for
  // guessing. Runs before the passcode is even read.
  const limit = await checkRateLimit(hashIp(clientIp(req)), 'admin-login', 10, 15 * 60)
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Too many attempts. Try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    )
  }
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
// guard: none — it only clears the caller's own session cookie
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', sessionCookieOptions(0))
  return res
}
