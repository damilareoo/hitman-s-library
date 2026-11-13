// lib/edge/image-pass.ts
//
// Our own captures and thumbnails, answered by the Worker without loading Next.
// On Cloudflare the Next image optimizer doesn't resize (no Images binding): it
// started the whole Next server for every card image only to hand back the
// original, with no cache header, so each image cost ~0.5s and a burst of CPU.
// Blob names are unique per upload, so the bytes behind a URL never change:
// cache them at the edge and in the browser for a year.
import { isOwnMedia } from '@/lib/media'

const RASTER = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'])

/** The source URL when this is an optimizer request for one of our own images; otherwise null (Next handles it). */
export function matchOwnImage(method: string, url: URL): string | null {
  if (method !== 'GET' || url.pathname !== '/_next/image') return null
  const src = url.searchParams.get('url') ?? ''
  if (!src.startsWith('https://') || !isOwnMedia(src)) return null
  return src
}

/** Headers for the browser, or null when the upstream isn't a raster image. */
export function imageHeaders(upstream: Headers): Headers | null {
  const type = (upstream.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  if (!RASTER.has(type)) return null
  const h = new Headers({ 'content-type': type, 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' })
  const len = upstream.get('content-length')
  if (len) h.set('content-length', len)
  return h
}
