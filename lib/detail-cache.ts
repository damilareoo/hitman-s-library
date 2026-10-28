'use client'

// Client-side detail cache for /api/design/<id>. The gallery prefetches on
// card hover so a click usually finds the row already here; the panel serves
// from it instantly and refreshes in the background.

type DetailRow = Record<string, unknown>

const cache = new Map<string, { data: DetailRow; at: number }>()
const inflight = new Map<string, Promise<DetailRow>>()

const TTL = 30_000

export function getCachedDetail(id: number | string): DetailRow | null {
  const hit = cache.get(String(id))
  return hit && Date.now() - hit.at < TTL ? hit.data : null
}

/** Fetch now if the row is neither cached nor already on the wire. */
export function prefetchDetail(id: number | string) {
  const key = String(id)
  if (cache.has(key) || inflight.has(key)) return
  fetchDetail(key).catch(() => { /* a failed prefetch costs nothing */ })
}

/** Always fetches (unless a request is already in flight) and caches. */
export function fetchDetail(id: number | string): Promise<DetailRow> {
  const key = String(id)
  const pending = inflight.get(key)
  if (pending) return pending
  const p = fetch(`/api/design/${key}`)
    .then(r => r.json())
    .then(raw => {
      cache.set(key, { data: raw, at: Date.now() })
      return raw as DetailRow
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
