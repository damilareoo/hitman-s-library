// app/api/taste/unsubscribe/route.ts
// Token-authenticated unsubscribe. The token is unguessable (uuid) and the
// only thing required — no session, no email echo.
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'

const sql = getSql()

export async function POST(req: Request) {
  // Token arrives in the JSON body from our own page, or in the query string
  // from a provider's one-click List-Unsubscribe POST (form-encoded, no body
  // token). Either authenticates; the token is unguessable either way.
  let token = new URL(req.url).searchParams.get('token') ?? ''
  try {
    const body = await req.json()
    if (typeof body?.token === 'string' && body.token) token = body.token
  } catch {
    /* form-encoded one-click posts have no JSON body — query token stands */
  }
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  try {
    const rows = await sql`DELETE FROM taste_subscribers WHERE unsub_token = ${token} RETURNING id`
    if (!rows.length) return NextResponse.json({ error: 'That link is invalid or already used.' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[unsubscribe]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
