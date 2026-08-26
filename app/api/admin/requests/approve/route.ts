// app/api/admin/requests/approve/route.ts
//
// Approval is where a request stops being a row and becomes real work. It calls
// the same extraction route the admin add form uses, so there is exactly one
// path that puts a site in the library — a second one would drift.
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/admin-auth'
import { revalidateTag } from 'next/cache'

const sql = neon(process.env.DATABASE_URL!)

// Extraction drives a browser; inherit the same ceiling the extract route sets
// rather than the platform default.
export const maxDuration = 60

export async function POST(req: NextRequest) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const rows = await sql`SELECT id, url, status FROM design_requests WHERE id = ${id}`
  if (rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (rows[0].status === 'added') {
    return NextResponse.json({ error: 'Already added' }, { status: 409 })
  }

  const url = rows[0].url as string

  const extractRes = await fetch(new URL('/api/design/extract', req.nextUrl.origin), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Forward the caller's own credentials rather than minting new ones.
      cookie: req.headers.get('cookie') ?? '',
      ...(req.headers.get('authorization')
        ? { authorization: req.headers.get('authorization')! }
        : {}),
    },
    body: JSON.stringify({ url }),
  })

  const result = await extractRes.json().catch(() => null)

  if (!extractRes.ok || !result?.success) {
    // The request stays pending. A failed approval is a thing to retry, not a
    // thing to lose.
    const reason = result?.error ?? result?.warning ?? `Extraction failed (${extractRes.status})`
    return NextResponse.json({ success: false, error: reason }, { status: 200 })
  }

  await sql`
    UPDATE design_requests
    SET status = 'added', source_id = ${result.id}, updated_at = NOW()
    WHERE id = ${id}
  `

  revalidateTag('designs', 'max')

  return NextResponse.json({ success: true, sourceId: String(result.id), title: result.title })
}
