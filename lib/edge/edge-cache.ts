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
