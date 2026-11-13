// lib/edge/edge-cache.ts
//
// Header handling for the Worker's edge cache. The stored copy has to say
// "keep me for a day" so Cloudflare holds it, but that instruction is for the
// edge only: browsers get back whatever the route itself sent.

export const STORED_AT = 'x-hl-stored-at'
const ORIGINAL_CC = 'x-hl-cache-control'
export const KEEP_SECONDS = 60 * 60 * 24

export function storedHeaders(original: Headers, now: number): Headers {
  const h = new Headers(original)
  const cc = original.get('cache-control')
  if (cc) h.set(ORIGINAL_CC, cc)
  h.set('cache-control', `public, max-age=${KEEP_SECONDS}`)
  h.set(STORED_AT, String(now))
  h.delete('vary') // the cache key already separates everything that varies
  return h
}

export function browserHeaders(from: Headers, state: 'HIT' | 'STALE' | 'MISS'): Headers {
  const h = new Headers(from)
  if (state !== 'MISS') {
    const original = h.get(ORIGINAL_CC)
    if (original) h.set('cache-control', original)
    else h.delete('cache-control')
  }
  h.delete(ORIGINAL_CC)
  h.delete(STORED_AT)
  h.set('x-hl-cache', state)
  // Browsers revalidate HTML each visit; the edge copy is what saves the CPU.
  if ((h.get('content-type') ?? '').includes('text/html')) h.set('cache-control', 'public, max-age=0, must-revalidate')
  return h
}

// Surfaces that are private, write data or vary per visitor never cache.
const NEVER = [
  '/admin', '/api/admin', '/api/cron', '/api/proxy', '/api/proxy-asset',
  '/api/request', '/api/taste', '/api/design/capture-upload', '/api/design/delete',
  '/api/design/extract', '/unsubscribe',
  // Pro: per-person metering and entitlement.
  '/api/kit', '/api/search',
  // Accounts: personal by definition. Pages stay anonymous; these never cache.
  '/api/auth', '/api/me', '/account',
]
const TRACKING = /^(utm_|fbclid$|gclid$|ref$|mc_)/
// The request headers a Next navigation (RSC) response varies on.
const RSC_HEADERS = ['rsc', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-router-state-tree', 'next-url']

export function cacheKind(req: Request, url: URL): 'page' | 'api' | null {
  if (req.method !== 'GET') return null
  if (url.hostname.startsWith('preview.')) return null
  // Next navigations carry _rsc, a hash of the router state they vary on, so
  // they cache safely by URL (plus those headers). Without it, don't.
  if ((req.headers.has('rsc') || req.headers.has('next-router-prefetch')) && !url.searchParams.has('_rsc')) return null
  if (/(?:^|;\s*)hl_admin=/.test(req.headers.get('cookie') ?? '')) return null
  const path = url.pathname
  if (NEVER.some(p => path === p || path.startsWith(p + '/'))) return null
  if (path.startsWith('/_next/') || path.startsWith('/cdn-cgi/')) return null
  if (path.startsWith('/api/')) return path.startsWith('/api/design/') || path === '/api/changelog' ? 'api' : null
  return 'page'
}

/** FNV-1a: short, stable, good enough to separate header combinations. */
function hash(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36)
}

export function cacheKey(req: Request, url: URL, version: string): Request {
  const key = new URL(url.toString())
  for (const name of [...key.searchParams.keys()]) if (TRACKING.test(name)) key.searchParams.delete(name)
  if (req.headers.has('rsc')) key.searchParams.set('__rsc', hash(RSC_HEADERS.map(h => `${h}=${req.headers.get(h) ?? ''}`).join('\n')))
  key.searchParams.sort()
  key.searchParams.set('__v', version)
  return new Request(key.toString(), { method: 'GET' })
}
