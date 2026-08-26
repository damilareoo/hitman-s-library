// app/api/request/route.ts
//
// The one public write path in the application. It writes a row and nothing
// else — no extraction, no headless browser, no blob storage. Approving a
// request is what starts real work, and that is behind the admin session.
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { assertPublicUrl, BlockedUrlError } from '@/lib/safe-url'
import { normalizeUrl, toAbsoluteUrl } from '@/lib/normalize-url'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

const sql = neon(process.env.DATABASE_URL!)

// Deliberately tight. Nobody has five genuine, distinct sites to suggest in
// ten minutes, and this is the endpoint that puts rows in front of a human.
const LIMIT = 5
const WINDOW_SECONDS = 60 * 10

export async function POST(req: Request) {
  let url = ''
  let honeypot = ''
  let preview: { title?: string; image?: string } = {}

  try {
    const body = await req.json()
    url = typeof body?.url === 'string' ? body.url : ''
    honeypot = typeof body?.company === 'string' ? body.company : ''
    if (body?.preview && typeof body.preview === 'object') preview = body.preview
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  // The honeypot is a field hidden from people and irresistible to form-filling
  // bots. Answer exactly as a success would, so there is nothing to learn from
  // the difference.
  if (honeypot.trim() !== '') {
    return NextResponse.json({ state: 'received' })
  }

  const normalized = normalizeUrl(url)
  if (!normalized || !normalized.includes('.')) {
    return NextResponse.json({ state: 'invalid', message: 'Enter a website address.' }, { status: 400 })
  }

  // The limiter runs before the URL is resolved, not after. assertPublicUrl
  // does a DNS lookup, and validating first meant a stream of invalid
  // addresses cost lookups without ever touching anyone's quota.
  const ipHash = hashIp(clientIp(req))
  const limit = await checkRateLimit(ipHash, 'request-submit', LIMIT, WINDOW_SECONDS)
  if (!limit.ok) {
    return NextResponse.json({
      state: 'rate-limited',
      retryAfterSeconds: limit.retryAfterSeconds,
      message: 'That is a lot of requests at once. Try again shortly.',
    }, { status: 429 })
  }

  try {
    await assertPublicUrl(toAbsoluteUrl(url))
  } catch (err) {
    return NextResponse.json({
      state: 'invalid',
      message: err instanceof BlockedUrlError
        ? 'That address is not a public website.'
        : 'That does not look like a valid address.',
    }, { status: 400 })
  }

  // Already in the library — answer with the site rather than filing a request
  // nobody needs to review.
  const existing = await sql`
    SELECT id, source_name
    FROM design_sources
    WHERE lower(regexp_replace(regexp_replace(source_url, '^https?://(www\.)?', ''), '/+$', '')) = ${normalized}
    LIMIT 1
  `
  if (existing.length > 0) {
    return NextResponse.json({
      state: 'existing',
      site: { id: String(existing[0].id), title: existing[0].source_name },
    })
  }

  // One row per site. A second person asking increments the count and revives
  // anything previously dismissed, so a site that gets asked for repeatedly
  // comes back rather than staying buried.
  const rows = await sql`
    INSERT INTO design_requests (url, normalized_url, preview_title, preview_image, ip_hash)
    VALUES (
      ${toAbsoluteUrl(url)},
      ${normalized},
      ${preview.title ?? null},
      ${preview.image ?? null},
      ${ipHash}
    )
    ON CONFLICT (normalized_url) DO UPDATE SET
      request_count = design_requests.request_count + 1,
      status = CASE WHEN design_requests.status = 'dismissed' THEN 'pending' ELSE design_requests.status END,
      preview_title = COALESCE(design_requests.preview_title, EXCLUDED.preview_title),
      preview_image = COALESCE(design_requests.preview_image, EXCLUDED.preview_image),
      updated_at = NOW()
    RETURNING id, request_count, status
  `

  const row = rows[0]
  return NextResponse.json({
    state: 'received',
    id: String(row.id),
    requestCount: row.request_count,
    status: row.status,
  })
}
