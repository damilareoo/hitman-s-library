// app/api/taste/subscribe/route.ts
// Public signup for the weekly digest. One email per row; favorites are
// re-averaged into the taste vector on every call so it tracks taste.
import { NextResponse } from 'next/server'
import { subscribe } from '@/lib/taste'

export async function POST(req: Request) {
  let email = ''
  let favoriteIds: number[] = []
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase().slice(0, 254) : ''
    if (Array.isArray(body?.favoriteIds)) {
      favoriteIds = body.favoriteIds.map(Number).filter(Number.isFinite)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }
  if (favoriteIds.length === 0) {
    return NextResponse.json({ error: 'Favorite at least one site first — it tunes your digest.' }, { status: 400 })
  }

  const result = await subscribe(email, favoriteIds)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
