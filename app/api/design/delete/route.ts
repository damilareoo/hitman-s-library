import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

const sql = neon(process.env.DATABASE_URL!)

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  try {
    const { id } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'Design ID required' }, { status: 400 })
    }

    // Read source info before deleting so we can log it
    const [source] = await sql`SELECT source_url, source_name FROM design_sources WHERE id = ${id}`

    const result = await sql`
      DELETE FROM design_sources WHERE id = ${id}
    `

    // Write changelog entry for deletion
    if (source) {
      await sql`
        INSERT INTO design_changelog (source_id, source_url, source_name, event_type)
        VALUES (NULL, ${source.source_url}, ${source.source_name}, 'deleted')
      `.catch(() => null)
    }

    // Category counts and the crawlable index are cached — drop a deleted site
    // out of both rather than leaving it listed for the rest of the window.
    revalidateTag('designs', 'max')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Delete error:', error)
    return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 })
  }
}
