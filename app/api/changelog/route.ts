import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const limit = Math.min(Math.max(1, parseInt(new URL(req.url).searchParams.get('limit') ?? '50') || 50), 100)
  const offset = Math.max(0, parseInt(new URL(req.url).searchParams.get('offset') ?? '0') || 0)

  try {
    const rows = await sql`
      SELECT id, source_id, source_url, source_name, event_type, created_at
      FROM design_changelog
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `
    const total = await sql`SELECT COUNT(*) as count FROM design_changelog`
    return NextResponse.json({ events: rows, total: Number(total[0].count) })
  } catch (err) {
    console.error('[changelog]', err)
    return NextResponse.json({ events: [], total: 0 }, { status: 500 })
  }
}
