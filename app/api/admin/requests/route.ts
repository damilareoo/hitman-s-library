// app/api/admin/requests/route.ts
// The review queue. Everything here is behind the admin session.
import { NextRequest, NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateTag } from 'next/cache'

const sql = getSql()

export async function GET(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'

  const rows = await sql`
    SELECT r.id, r.url, r.normalized_url, r.status, r.source_id,
           r.preview_title, r.preview_image, r.request_count, r.created_at, r.email,
           r.note, r.credit,
           -- Pro members' requests are reviewed first.
           (p.user_id IS NOT NULL) AS pro
    FROM design_requests r
    LEFT JOIN pro_users p ON p.user_id = r.user_id
    WHERE r.status = ${status}
    ORDER BY pro DESC, r.request_count DESC, r.created_at DESC
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
      pro: Boolean(r.pro),
      image: r.preview_image,
      requestCount: r.request_count,
      createdAt: r.created_at,
      email: r.email ?? null,
      note: r.note ?? null,
      credit: r.credit ?? null,
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
