// lib/palette-client.ts
//
// The main colours of an image, measured in the browser: the image is drawn
// small, pixels are bucketed (4 bits per channel), buckets ranked by area,
// and near-duplicates of a colour already picked are skipped. The same idea
// as lib/palette-from-image.ts on the server, but the image never leaves the
// device.
'use client'

import { hexToOklab } from '@/lib/kit/color'

const hex = (n: number) => n.toString(16).padStart(2, '0')
const NEAR = 0.06 // OKLab distance under which two colours read as the same

export function rankPalette(rgba: Uint8ClampedArray, max = 6): string[] {
  const counts = new Map<number, number>()
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue
    const key = ((rgba[i] >> 4) << 8) | ((rgba[i + 1] >> 4) << 4) | (rgba[i + 2] >> 4)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const picked: { hex: string; lab: [number, number, number] }[] = []
  const total = [...counts.values()].reduce((a, b) => a + b, 0)
  for (const [key, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    // Under 2% of the image is edge blending from the resize, not a real colour.
    if (n / total < 0.02) break
    // Bucket centre, as 17 × nibble so 0xf maps back to 0xff.
    const c = '#' + [key >> 8, (key >> 4) & 15, key & 15].map(v => hex(v * 17)).join('')
    const lab = hexToOklab(c)
    if (picked.some(p => Math.hypot(p.lab[0] - lab[0], p.lab[1] - lab[1], p.lab[2] - lab[2]) < NEAR)) continue
    picked.push({ hex: c, lab })
    if (picked.length >= max) break
  }
  return picked.map(p => p.hex)
}

export async function paletteFromFile(file: File, max = 6): Promise<string[]> {
  if (!file.type.startsWith('image/') || file.size > 20 * 1024 * 1024) return []
  const bitmap = await createImageBitmap(file)
  const c = document.createElement('canvas'); c.width = 64; c.height = 64
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(bitmap, 0, 0, 64, 64)
  bitmap.close()
  return rankPalette(g.getImageData(0, 0, 64, 64).data, max)
}
