// app/api/request/status/route.ts
//
// Closes the loop. The browser remembers what it asked for; this tells it what
// happened. Public, but it only ever answers about URLs the caller already
// named, so it discloses nothing they could not have discovered by typing the
// URL into the request form.
import { NextResponse } from 'next/server'
import { getSql } from '@/lib/db'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

const sql = getSql()

const MAX_URLS = 25

export async function POST(req: Request) {
  // The page polls this, so the allowance is generous; it only stops a loop.
  const limit = await checkRateLimit(hashIp(clientIp(req)), 'request-status', 120, 60 * 60)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many checks. Try again shortly.' }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } })
  }
  let urls: string[] = []
  try {
    const body = await req.json()
    urls = Array.isArray(body?.urls) ? body.urls.filter((u: unknown) => typeof u === 'string') : []
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (urls.length === 0) return NextResponse.json({ statuses: {} })

  const wanted = urls.slice(0, MAX_URLS)

  const rows = await sql`
    SELECT r.normalized_url, r.status, r.request_count, r.source_id, s.source_name
    FROM design_requests r
    LEFT JOIN design_sources s ON s.id = r.source_id
    WHERE r.normalized_url = ANY(${wanted}::text[])
  `

  const statuses: Record<string, unknown> = {}
  for (const row of rows) {
    statuses[row.normalized_url as string] = {
      status: row.status,
      requestCount: row.request_count,
      sourceId: row.source_id ? String(row.source_id) : null,
      title: row.source_name ?? null,
    }
  }

  return NextResponse.json({ statuses })
}
