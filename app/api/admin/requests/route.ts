// app/api/admin/requests/route.ts
// The review queue. Everything here is behind the admin session.
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateTag } from 'next/cache'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'

  const rows = await sql`
    SELECT id, url, normalized_url, status, source_id,
           preview_title, preview_image, request_count, created_at
    FROM design_requests
    WHERE status = ${status}
    ORDER BY request_count DESC, created_at DESC
    LIMIT 200
  `

  const [counts] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
      COUNT(*) FILTER (WHERE status = 'added')::int     AS added,
      COUNT(*) FILTER (WHERE status = 'dismissed')::int AS dismissed
    FROM design_requests
  `

  return NextResponse.json({
    requests: rows.map(r => ({
      id: String(r.id),
      url: r.url,
      status: r.status,
      sourceId: r.source_id ? String(r.source_id) : null,
      title: r.preview_title,
      image: r.preview_image,
      requestCount: r.request_count,
      createdAt: r.created_at,
    })),
    counts,
  })
}

/** Dismiss a request, or revive a dismissed one. */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id, status } = await req.json().catch(() => ({}))
  if (!id || !['pending', 'dismissed'].includes(status)) {
    return NextResponse.json({ error: 'id and a valid status are required' }, { status: 400 })
  }

  await sql`UPDATE design_requests SET status = ${status}, updated_at = NOW() WHERE id = ${id}`
  revalidateTag('designs', 'max')

  return NextResponse.json({ success: true })
}
