// lib/kit/capture-proxy.ts
// Hands a stored capture back from our own origin, safely. Only raster types
// pass (an SVG can carry script, and some captures are third-party og:images
// whose host could start serving one). The response is sandboxed and a
// download, so even a mislabelled body can't run as the site; and the size cap
// holds for bodies that never declared a length.
import { NO_STORE } from '@/lib/auth/request'

const RASTER = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'])

/** The response to send, or null when the upstream must be refused. */
export function passCapture(upstream: Response, maxBytes: number): Response | null {
  const type = (upstream.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase()
  const declared = Number(upstream.headers.get('content-length') ?? 0)
  if (!upstream.ok || !upstream.body || !RASTER.has(type) || declared > maxBytes) return null
  let seen = 0
  const capped = upstream.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, ctl) {
      seen += chunk.byteLength
      if (seen > maxBytes) ctl.error(new Error('capture too large'))
      else ctl.enqueue(chunk)
    },
  }))
  return new Response(capped, {
    headers: {
      'content-type': type,
      'content-security-policy': "sandbox; default-src 'none'",
      'x-content-type-options': 'nosniff',
      'content-disposition': 'attachment',
      ...NO_STORE,
    },
  })
}
