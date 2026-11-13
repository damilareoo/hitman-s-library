// lib/media.ts
// Where our own images live. Captures and thumbnails are moving from Vercel
// Blob to Cloudflare R2 (served from media.hitmanslibrary.xyz); both count as
// "ours" while old links stay valid, so the optimizer and capture checks treat
// them the same.
export const MEDIA_HOST = 'media.hitmanslibrary.xyz'
export const MEDIA_ORIGIN = `https://${MEDIA_HOST}`
const BLOB_HOST = '.public.blob.vercel-storage.com'

export function isOwnMedia(url: string | null | undefined): boolean {
  if (!url) return false
  try {
    const h = new URL(url).hostname
    return h === MEDIA_HOST || h.endsWith(BLOB_HOST)
  } catch { return false }
}
