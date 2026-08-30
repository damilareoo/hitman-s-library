import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const rows = await sql`
    UPDATE design_sources
    SET
      screenshot_url = thumbnail_url,
      metadata = COALESCE(metadata, '{}') - 'extraction_error'
    WHERE screenshot_url IS NULL
      AND thumbnail_url IS NOT NULL
      AND length(trim(thumbnail_url)) > 0
    RETURNING id, source_name, source_url
  `

  return NextResponse.json({
    salvaged: rows.length,
    rows,
  })
}
