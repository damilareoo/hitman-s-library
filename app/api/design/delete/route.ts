import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest) {
  // Admin authentication check
  const authHeader = req.headers.get('x-admin-password')
  const adminPassword = process.env.ADMIN_PASSWORD
  
  if (!adminPassword || !authHeader || authHeader !== adminPassword) {
    return NextResponse.json({
      error: 'Unauthorized: Admin access required',
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
