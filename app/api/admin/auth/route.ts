import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { passcode } = await req.json()
    const expected = process.env.ADMIN_PASSWORD

    if (!expected) {
      return NextResponse.json({ error: 'Admin passcode not configured' }, { status: 500 })
    }

    if (passcode === expected) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
