// app/api/request/route.ts
//
// The one public write path in the application. It writes a row and nothing
// else — no extraction, no headless browser, no blob storage. Approving a
// request is what starts real work, and that is behind the admin session.
import { after, NextResponse } from 'next/server'
import { flushPostHogLogs, logPostHogInfo } from '@/instrumentation'
import { getSql } from '@/lib/db'
import { assertPublicUrl, BlockedUrlError } from '@/lib/safe-url'
import { normalizeUrl, toAbsoluteUrl } from '@/lib/normalize-url'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

const sql = getSql()

// Deliberately tight. Nobody has five genuine, distinct sites to suggest in
// ten minutes, and this is the endpoint that puts rows in front of a human.
const LIMIT = 5
const WINDOW_SECONDS = 60 * 10

export async function POST(req: Request) {
  let url = ''
  let honeypot = ''
  let email: string | null = null
  let preview: { title?: string; image?: string } = {}

  try {
    const body = await req.json()
    url = typeof body?.url === 'string' ? body.url : ''
    honeypot = typeof body?.company === 'string' ? body.company : ''
    // Optional contact so an approved request can be answered. Validated
    // loosely and length-capped; anything else is dropped, not rejected —
    // a bad email must never cost someone their request.
    if (typeof body?.email === 'string') {
      const candidate = body.email.trim().slice(0, 254)
      email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(candidate) ? candidate : null
    }
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

  // One address per line, comma, or space run — a batch counts as one
  // submission against the limiter, not one per address.
  const candidates = url
    .split(/[\n,]+/)
    .map(part => part.trim())
    .filter(Boolean)
    .slice(0, 10)
  if (candidates.length === 0) {
    return NextResponse.json({ state: 'invalid', message: 'Enter a website address.' }, { status: 400 })
  }

  // The limiter runs before any URL is resolved, not after. assertPublicUrl
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

  async function handleOne(raw: string): Promise<Record<string, unknown>> {
    const normalized = normalizeUrl(raw)
    if (!normalized || !normalized.includes('.')) {
      return { url: raw, state: 'invalid', message: 'That does not look like a valid address.' }
    }

    try {
      await assertPublicUrl(toAbsoluteUrl(raw))
    } catch (err) {
      return {
        url: raw,
        state: 'invalid',
        message: err instanceof BlockedUrlError
          ? 'That address is not a public website.'
          : 'That does not look like a valid address.',
      }
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
      return {
        url: raw,
        state: 'existing',
        site: { id: String(existing[0].id), title: existing[0].source_name },
      }
    }

    // One row per site. A second person asking increments the count and revives
    // anything previously dismissed, so a site that gets asked for repeatedly
    // comes back rather than staying buried.
    // The live preview only resolves the single address the visitor typed, so
    // batch rows carry no preview — the reviewer sees the address itself.
    const single = candidates.length === 1
    const rows = await sql`
      INSERT INTO design_requests (url, normalized_url, preview_title, preview_image, ip_hash, email)
      VALUES (
        ${toAbsoluteUrl(raw)},
        ${normalized},
        ${single ? preview.title ?? null : null},
        ${single ? preview.image ?? null : null},
        ${ipHash},
        ${email}
      )
      ON CONFLICT (normalized_url) DO UPDATE SET
        request_count = design_requests.request_count + 1,
        email = COALESCE(design_requests.email, EXCLUDED.email),
        status = CASE WHEN design_requests.status = 'dismissed' THEN 'pending' ELSE design_requests.status END,
        preview_title = COALESCE(design_requests.preview_title, EXCLUDED.preview_title),
        preview_image = COALESCE(design_requests.preview_image, EXCLUDED.preview_image),
        updated_at = NOW()
      RETURNING id, request_count, status
    `
    const row = rows[0]
    return {
      url: raw,
      state: 'received',
      id: String(row.id),
      requestCount: row.request_count,
      status: row.status,
    }
  }

  // Single address keeps the exact historical shapes the dialog's preview
  // flow branches on. Batches return one shared shape instead.
  if (candidates.length === 1) {
    const single = await handleOne(candidates[0])
    if (single.state === 'existing') {
      return NextResponse.json({ state: 'existing', site: single.site })
    }
    if (single.state === 'invalid') {
      return NextResponse.json({ state: 'invalid', message: single.message }, { status: 400 })
    }
    logPostHogInfo('site request accepted', {
      submission_type: 'single',
      candidate_count: 1,
    })
    after(flushPostHogLogs)

    return NextResponse.json({
      state: 'received',
      id: single.id,
      requestCount: single.requestCount,
      status: single.status,
    })
  }

  const results = []
  for (const raw of candidates) {
    results.push(await handleOne(raw))
  }

  logPostHogInfo('site request batch processed', {
    submission_type: 'batch',
    candidate_count: candidates.length,
    accepted_count: results.filter(result => result.state === 'received').length,
  })
  after(flushPostHogLogs)

  return NextResponse.json({ state: 'batch', results })
}
