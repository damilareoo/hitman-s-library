// cloudflare-worker.ts
//
// The Worker entry. It answers repeat GETs from Cloudflare's edge cache before
// the Next.js server is ever loaded.
//
// Why: Workers run in front of the CDN cache, so the `s-maxage` headers the
// routes set were never honoured — every visit started the 9 MB Next server and
// rendered from scratch. A cold start alone costs 150-400 ms of CPU, past the
// free plan's ceiling, and Cloudflare answered some visitors with error 1102.
//
// What is cached: anonymous GETs of pages and public read APIs, per URL and per
// deployed version (a new deploy never serves HTML that points at old assets).
// Fresh for a short window, then served stale while one request refreshes it in
// the background, so visitors almost never wait on a render.
//
// What never is: admin, cron, the preview proxy, forms, unsubscribe, Next's
// client-navigation (RSC) requests, anything carrying the admin cookie, and any
// response that sets a cookie or is not a 200.

// @ts-ignore: produced by `opennextjs-cloudflare build` (absent before a build)
import openNext from './.open-next/worker.js'
// @ts-ignore: produced by `opennextjs-cloudflare build` (absent before a build)
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js'
import { matchFastPath } from './lib/edge/fast-path'
import { getSiteDetail } from './lib/read/site-detail'
import { queryDesigns } from './lib/design-queries'
import { securityHeaders, withSecurityHeaders } from './lib/edge/security-headers'
import { matchOwnImage, imageHeaders } from './lib/edge/image-pass'
import { STORED_AT, browserHeaders, cacheKey, cacheKind, storedHeaders } from './lib/edge/edge-cache'

interface Ctx {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException?(): void
}
interface Env {
  CF_VERSION_METADATA?: { id?: string }
  DATABASE_URL?: string
  DEV_BYPASS?: string
  CSP_ENFORCE?: string
  [key: string]: unknown
}

const FRESH_SECONDS = { page: 300, api: 60 } as const

async function store(cache: Cache, key: Request, res: Response): Promise<void> {
  if (res.status !== 200 || res.headers.has('set-cookie')) return
  await cache.put(key, new Response(res.body, { status: 200, headers: storedHeaders(res.headers, Date.now()) }))
}

function forBrowser(res: Response, state: 'HIT' | 'STALE' | 'MISS'): Response {
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: browserHeaders(res.headers, state) })
}

// Next marks every error response from a dynamic route as uncacheable; match it.
const NEXT_NO_STORE = 'private, no-cache, no-store, max-age=0, must-revalidate'
const json = (body: unknown, status: number, cacheControl?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(cacheControl ? { 'cache-control': cacheControl } : status >= 400 ? { 'cache-control': NEXT_NO_STORE } : {}),
    },
  })

/**
 * Answer the request: the two hottest reads straight from Neon (no Next), all
 * else through Next. Same JSON either way — both use the same query modules.
 */
async function origin(request: Request, env: Env, ctx: Ctx, url: URL): Promise<Response> {
  const fast = env.DEV_BYPASS === '1' && url.searchParams.has('__nofast') ? null : matchFastPath(request.method, url)
  if (!fast) return openNext.fetch(request, env, ctx)
  // lib/db reads process.env lazily; outside Next nothing has copied it over yet.
  if (env.DATABASE_URL && !process.env.DATABASE_URL) process.env.DATABASE_URL = env.DATABASE_URL
  try {
    if (fast.kind === 'site') {
      const detail = await getSiteDetail(fast.id)
      return detail ? json(detail, 200) : json({ error: 'Not found' }, 404)
    }
    const result = await queryDesigns(fast.query)
    return json(result, 200, 'public, s-maxage=60, stale-while-revalidate=600')
  } catch (err) {
    console.error('[fast-path]', url.pathname, err)
    return fast.kind === 'site'
      ? json({ error: 'Internal error' }, 500)
      : json({ error: 'Failed to load designs', designs: [], pagination: { total: 0, limit: 32, offset: 0, hasMore: false } }, 500)
  }
}

/** The host that serves live previews for the site at `url` ('' when there is none). */
function previewOriginFor(url: URL): string {
  const host = url.hostname
  if (host === 'localhost') return `${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ''}`
  const apex = host.replace(/^www\./, '')
  return apex === 'hitmanslibrary.xyz' ? `${url.protocol}//preview.${apex}` : ''
}

export default {
  async fetch(request: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(request.url)
    const res = await handle(request, env, ctx, url)
    return withSecurityHeaders(res, securityHeaders({
      enforceCsp: env.CSP_ENFORCE === '1',
      previewOrigin: previewOriginFor(url),
      host: url.host,
      path: url.pathname,
    }))
  },
}

async function handle(request: Request, env: Env, ctx: Ctx, url: URL): Promise<Response> {
  const own = matchOwnImage(request.method, url)
  if (own) {
    try {
      // Cloudflare keeps the original at the edge; no Next, next to no CPU.
      const upstream = await fetch(own, { cf: { cacheEverything: true, cacheTtl: 31536000 } } as RequestInit)
      const headers = upstream.ok ? imageHeaders(upstream.headers) : null
      if (headers) return new Response(upstream.body, { headers })
    } catch { /* fall through to Next */ }
    return openNext.fetch(request, env, ctx)
  }
  const k = cacheKind(request, url)
  if (!k) return origin(request, env, ctx, url)

  const cache = (caches as unknown as { default: Cache }).default
  const key = cacheKey(request, url, env.CF_VERSION_METADATA?.id ?? 'dev')

  let hit: Response | undefined
  try { hit = await cache.match(key) } catch { hit = undefined }

  if (hit) {
    const age = (Date.now() - Number(hit.headers.get(STORED_AT) ?? 0)) / 1000
    if (age <= FRESH_SECONDS[k]) return forBrowser(hit, 'HIT')
    // Stale: answer now, refresh once in the background.
    ctx.waitUntil((async () => {
      try {
        const fresh: Response = await origin(new Request(request), env, ctx, url)
        await store(cache, key, fresh)
      } catch { /* keep serving the stale copy */ }
    })())
    return forBrowser(hit, 'STALE')
  }

  const res: Response = await origin(request, env, ctx, url)
  if (res.status === 200 && !res.headers.has('set-cookie')) {
    ctx.waitUntil(store(cache, key, res.clone()).catch(() => {}))
  }
  return forBrowser(res, 'MISS')
}
