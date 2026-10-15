// lib/image-hash.ts
// Server-only perceptual hash for captures (Phase 1).
//
// A 64-bit difference hash over an 8x8 grayscale thumbnail: same layout and
// palette hashes within a few bits, a redesign lands far away. Stored on the
// history row at write time so reads compare strings, never images.
//
// The fetch also reports the file size, which doubles as the blank-capture
// guard for similarity search (Phase 2): failed captures sit under ~35KB
// while the library median is ~426KB.
//
// sharp is imported dynamically so this module never loads native code on
// import — only when a hash is actually computed, inside nodejs routes.
export interface ImageInfo {
  hash: string | null
  /** Capture file size in bytes, null when the fetch failed. */
  bytes: number | null
}

export async function fetchImageInfo(url: string): Promise<ImageInfo> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { hash: null, bytes: null }
    const buf = Buffer.from(await res.arrayBuffer())
    if (!buf.length) return { hash: null, bytes: null }
    return { hash: await dhashFromBuffer(buf), bytes: buf.length }
  } catch {
    return { hash: null, bytes: null }
  }
}

/** Back-compat for callers that only need the hash. */
export async function dhashFromUrl(url: string): Promise<string | null> {
  return (await fetchImageInfo(url)).hash
}

export async function dhashFromBuffer(buf: Buffer): Promise<string | null> {
  try {
    const { default: sharp } = await import('sharp')
    const raw = await sharp(buf).resize(9, 8, { fit: 'fill' }).grayscale().raw().toBuffer()
    if (raw.length < 72) return null
    let hi = 0
    let lo = 0
    // 8 rows of 9 pixels → 64 horizontal comparisons, packed hi then lo.
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8)
      const col = i % 8
      const left = raw[row * 9 + col]
      const right = raw[row * 9 + col + 1]
      if (left > right) {
        if (i < 32) hi |= 1 << (31 - i)
        else lo |= 1 << (63 - i)
      }
    }
    return (hi >>> 0).toString(16).padStart(8, '0') + (lo >>> 0).toString(16).padStart(8, '0')
  } catch {
    return null
  }
}
