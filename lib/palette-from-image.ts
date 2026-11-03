// lib/palette-from-image.ts
//
// Dominant colours measured from a rendered image: pixels bucketed in 4-bit
// RGB, ranked by area, near-duplicates of an already-picked colour skipped.
// This is measurement, not guessing — the same principle the browser
// extraction uses for area shares, applied to a capture taken elsewhere
// (an external renderer, or the user's own machine behind a bot wall).
import sharp from 'sharp'

export async function samplePalette(buf: Buffer, maxColors = 8): Promise<string[]> {
  try {
    const { data, info } = await sharp(buf)
      .resize(64, 64, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const buckets = new Map<number, { r: number; g: number; b: number; n: number }>()
    for (let i = 0; i < data.length; i += info.channels) {
      const r = data[i]!
      const g = data[i + 1]!
      const b = data[i + 2]!
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.r += r
        bucket.g += g
        bucket.b += b
        bucket.n++
      } else {
        buckets.set(key, { r, g, b, n: 1 })
      }
    }

    const picked: Array<{ r: number; g: number; b: number }> = []
    for (const bucket of [...buckets.values()].sort((a, b) => b.n - a.n)) {
      const avg = {
        r: Math.round(bucket.r / bucket.n),
        g: Math.round(bucket.g / bucket.n),
        b: Math.round(bucket.b / bucket.n),
      }
      const nearDuplicate = picked.some(
        p => Math.abs(p.r - avg.r) + Math.abs(p.g - avg.g) + Math.abs(p.b - avg.b) < 24,
      )
      if (nearDuplicate) continue
      picked.push(avg)
      if (picked.length >= maxColors) break
    }

    return picked.map(({ r, g, b }) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''))
  } catch (err) {
    console.warn('[palette] sampling failed:', err)
    return []
  }
}
