import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'ID required' }, { status: 400 })
    }

    // Delete associated records first (foreign key constraints)
    await sql`DELETE FROM design_colors WHERE source_id = ${id}`.catch(() => null)
    await sql`DELETE FROM design_typography WHERE source_id = ${id}`.catch(() => null)
    
    // Delete the main record
    const result = await sql`DELETE FROM design_sources WHERE id = ${id}`
    
    return NextResponse.json({ success: true, deleted: result.count > 0 })
  } catch (error) {
    console.error('[v0] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
