// app/api/design/[id]/route.ts
import { getSql } from '@/lib/db'
import { parseId } from '@/lib/parse-id'
import { getSiteDetail } from '@/lib/read/site-detail'
import { requireAdmin } from '@/lib/admin-auth'
import { KINDS } from '@/lib/categories'
import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

const sql = getSql()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }
  try {
    const detail = await getSiteDetail(id)
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(detail)
  } catch (err) {
    console.error('[GET /api/design/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Re-file a source. This is the admin's correction path for a kind the
 * classifier got wrong — the only place a kind is written after extraction.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(req)
  if (denied) return denied

  const { id: rawId } = await params
  const id = parseId(rawId)
  if (id === null) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
  }

  let body: { kind?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const kind = typeof body.kind === 'string' ? body.kind : ''
  if (!(KINDS as readonly string[]).includes(kind)) {
    return NextResponse.json({ error: `Unknown kind: ${kind || '(empty)'}` }, { status: 400 })
  }

  try {
    const rows = await sql`
      UPDATE design_sources SET kind = ${kind} WHERE id = ${id}
      RETURNING id, kind
    `
    if (!rows.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    revalidateTag('designs', 'max')
    return NextResponse.json({ id: rows[0].id, kind: rows[0].kind })
  } catch (err) {
    console.error('[PATCH /api/design/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
