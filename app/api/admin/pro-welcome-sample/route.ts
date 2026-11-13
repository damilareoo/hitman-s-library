// app/api/admin/pro-welcome-sample/route.ts
// Admin only: send the Pro welcome email to an existing member, to preview it
// in a real inbox. Sends nothing to anyone without an account.
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getSql } from '@/lib/db'
import { sendProWelcome } from '@/lib/email/send-pro-welcome'

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied
  const { email } = await req.json().catch(() => ({})) as { email?: string }
  if (!email || typeof email !== 'string') return NextResponse.json({ error: 'email required' }, { status: 400 })
  const [u] = await getSql()`SELECT id FROM users WHERE email = ${email.trim().toLowerCase()}`
  if (!u) return NextResponse.json({ error: 'no member with that email' }, { status: 404 })
  try {
    await sendProWelcome(u.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[pro-welcome-sample]', err)
    return NextResponse.json({ error: 'send failed' }, { status: 502 })
  }
}
