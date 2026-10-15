// lib/thumbnail-optimize.ts
// Work order 1 (performance): re-encode hotlinked thumbnails into our own
// blob storage. Server-only (sharp + blob upload).
//
// Origin CDNs serve full-size originals — animated GIFs included — and the
// grid hotlinked them as-is. The optimizer output is a 640px webp first
// frame: sharp decodes only frame one of an animated input, so GIFs freeze
// for the grid while the detail panel and hover clips keep the motion.
import { put } from '@vercel/blob'

/** Card slots render at ~283px; 640px is generous headroom for DPR 2. */
export const THUMBNAIL_WIDTH = 640

export async function optimizeThumbnail(
  thumbnailUrl: string | null,
  siteUrl: string,
): Promise<string | null> {
  if (!thumbnailUrl || !thumbnailUrl.startsWith('http')) return null
  try {
    const res = await fetch(thumbnailUrl, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) return null
    const { default: sharp } = await import('sharp')
    // Cover to the card ratio (16:10) at 640 wide: og-images arrive in every
    // aspect and the grid must read as one thing. withoutEnlargement alone
    // cannot normalize small inputs, so the crop is explicit: center-cut a
    // 16:10 box first, then shrink it to fit.
    const pipeline = sharp(buf, { animated: false }).rotate()
    const meta = await pipeline.metadata()
    const iw = meta.width ?? THUMBNAIL_WIDTH
    const ih = meta.height ?? 400
    const boxW = Math.min(iw, Math.floor((ih * 16) / 10))
    const boxH = Math.min(ih, Math.floor((boxW * 10) / 16))
    const out = await pipeline
      .extract({
        left: Math.max(0, Math.floor((iw - boxW) / 2)),
        top: Math.max(0, Math.floor((ih - boxH) / 2)),
        width: boxW,
        height: boxH,
      })
      .resize({ width: Math.min(THUMBNAIL_WIDTH, boxW), withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    if (!out.length) return null
    const hostname = new URL(siteUrl).hostname.replace(/\./g, '-')
    const blob = await put(`thumbnails/${hostname}-${Date.now()}.webp`, out, {
      access: 'public',
      contentType: 'image/webp',
    })
    return blob.url
  } catch (err) {
    console.warn(`[thumbnail] optimize failed for ${siteUrl}:`, err instanceof Error ? err.message.slice(0, 100) : err)
    return null
  }
}
