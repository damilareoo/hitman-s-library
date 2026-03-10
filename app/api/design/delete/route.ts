import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest) {
  // Admin PIN protection
  const authHeader = req.headers.get('x-admin-pin')
  const adminPin = process.env.ADMIN_PIN
  
  if (!adminPin || !authHeader || authHeader !== adminPin) {
    return NextResponse.json({
      error: 'Unauthorized: Invalid PIN',
      success: false
    }, { status: 401 })
  }

  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Design ID required' }, { status: 400 })
    }

    const result = await sql`
      DELETE FROM design_sources WHERE id = ${id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
