import { describe, expect, test } from 'bun:test'
import { rankPalette } from './palette-client'

/** RGBA pixels: n of each colour. */
function pixels(spec: [number, number, number, number][]) {
  const out: number[] = []
  for (const [r, g, b, n] of spec) for (let i = 0; i < n; i++) out.push(r, g, b, 255)
  return new Uint8ClampedArray(out)
}

describe('rankPalette', () => {
  test('ranks colours by area, largest first', () => {
    expect(rankPalette(pixels([[255, 255, 255, 50], [17, 17, 17, 30], [255, 85, 38, 10]]), 6)).toEqual(['#ffffff', '#111111', '#ff5522'])
  })
  test('skips near-duplicates of a colour already picked', () => {
    expect(rankPalette(pixels([[250, 250, 250, 50], [255, 255, 255, 40], [17, 17, 17, 30]]), 6)).toEqual(['#ffffff', '#111111'])
  })
  test('caps at max', () => {
    const many = Array.from({ length: 10 }, (_, i) => [i * 25, 255 - i * 25, (i * 60) % 255, 10 - i] as [number, number, number, number])
    expect(rankPalette(pixels(many), 6)).toHaveLength(6)
  })
  test('ignores transparent pixels', () => {
    const px = new Uint8ClampedArray([255, 0, 0, 0, 255, 0, 0, 0, 0, 0, 255, 255])
    expect(rankPalette(px, 6)).toEqual(['#0000ff'])
  })
})
