// app/api/request/preview/route.ts
//
// Resolves a typed URL into something the requester can recognise before they
// commit to asking for it — and, more often than not, into a link to the site
// they did not realise was already here.
//
// Public and unauthenticated, so it is rate limited and makes its outbound
// request through safeFetch, which re-validates every redirect hop. It never
// touches the headless browser.
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { safeFetch, assertPublicUrl, BlockedUrlError } from '@/lib/safe-url'
import { normalizeUrl, toAbsoluteUrl } from '@/lib/normalize-url'
import { checkRateLimit, clientIp, hashIp } from '@/lib/rate-limit'

const sql = neon(process.env.DATABASE_URL!)

// Generous: this fires while someone is typing, and being throttled mid-paste
// would feel like the feature is broken rather than protected.
const LIMIT = 40
const WINDOW_SECONDS = 60 * 10

export async function POST(req: Request) {
  let url: string
  try {
    const body = await req.json()
    url = typeof body?.url === 'string' ? body.url : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const normalized = normalizeUrl(url)
  if (!normalized || !normalized.includes('.')) {
    return NextResponse.json({ state: 'incomplete' })
  }

  const ipHash = hashIp(clientIp(req))
  const limit = await checkRateLimit(ipHash, 'request-preview', LIMIT, WINDOW_SECONDS)
  if (!limit.ok) {
    return NextResponse.json(
      { state: 'rate-limited', retryAfterSeconds: limit.retryAfterSeconds },
      { status: 429 },
    )
  }

  // --- Already in the library? This is the most likely answer, so it is the
  // first one we look for. Matching on the normalized form means a request for
  // "https://www.stripe.com/" finds the stored "https://stripe.com".
  const existing = await sql`
    SELECT id, source_name, screenshot_url
    FROM design_sources
    WHERE lower(regexp_replace(regexp_replace(source_url, '^https?://(www\.)?', ''), '/+$', '')) = ${normalized}
    LIMIT 1
  `
  if (existing.length > 0) {
    return NextResponse.json({
      state: 'existing',
      site: {
        id: String(existing[0].id),
        title: existing[0].source_name,
        image: existing[0].screenshot_url,
      },
    })
  }

  // --- Already asked for?
  const requested = await sql`
    SELECT status, request_count, preview_title, preview_image, source_id
    FROM design_requests
    WHERE normalized_url = ${normalized}
    LIMIT 1
  `
  if (requested.length > 0) {
    const row = requested[0]
    return NextResponse.json({
      state: row.status === 'dismissed' ? 'new' : 'already-requested',
      status: row.status,
      requestCount: row.request_count,
      sourceId: row.source_id ? String(row.source_id) : null,
      preview: { title: row.preview_title, image: row.preview_image },
    })
  }

  // --- New. Fetch just enough to show them what they are asking for.
  try {
    await assertPublicUrl(toAbsoluteUrl(url))
  } catch (err) {
    return NextResponse.json({
      state: 'unreachable',
      message: err instanceof BlockedUrlError
        ? 'That address is not a public website.'
        : 'That does not look like a valid address.',
    })
  }

  try {
    const res = await safeFetch(toAbsoluteUrl(url), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HitmansLibrary/1.0; +https://hitmanslibrary.xyz)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    })

    // A challenge page or an error still tells us the host exists, and the
    // browser may well render it fine at extraction time — so this is a preview
    // without a picture, not a refusal.
    const html = res.ok ? (await res.text()).slice(0, 200_000) : ''
    const origin = new URL(toAbsoluteUrl(url)).origin

    return NextResponse.json({
      state: 'new',
      preview: {
        title: pickTitle(html) ?? new URL(toAbsoluteUrl(url)).hostname,
        image: pickImage(html, origin),
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(toAbsoluteUrl(url)).hostname}&sz=64`,
        reachable: res.ok,
      },
    })
  } catch {
    // Unreachable now does not mean unwantable. Let them ask anyway.
    return NextResponse.json({
      state: 'new',
      preview: {
        title: new URL(toAbsoluteUrl(url)).hostname,
        image: null,
        favicon: `https://www.google.com/s2/favicons?domain=${new URL(toAbsoluteUrl(url)).hostname}&sz=64`,
        reachable: false,
      },
    })
  }
}

function pickTitle(html: string): string | null {
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)/i)
  if (og?.[1]) return decode(og[1])
  const title = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  if (title?.[1]) return decode(title[1].split(/[|–—\-]/)[0].trim() || title[1])
  return null
}

function pickImage(html: string, origin: string): string | null {
  const match =
    html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) ??
    html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)/i)
  if (!match?.[1]) return null
  try {
    return new URL(decode(match[1]), origin).href
  } catch {
    return null
  }
}

function decode(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .trim()
}
