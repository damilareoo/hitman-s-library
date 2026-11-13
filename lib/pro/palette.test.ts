import { describe, expect, test } from 'bun:test'
import { centreOf, hueWindow, legible } from './palette'

const sw = (hexes: string[]) => hexes.map(h => [h, ''] as [string, string])

describe('palette', () => {
  test('the centre sits in the middle of the colours, not at the edge of the window', () => {
    const c = centreOf(sw(['#2b6cff', '#3b82f6', '#1d4ed8', '#2563eb', '#1e40af', '#3a5bd9']))
    expect(c).toBeGreaterThan(215); expect(c).toBeLessThan(230)
  })
  test('wraps around red', () => {
    const c = centreOf(sw(['#ff1a1a', '#e60039', '#ff3300', '#cc0022', '#ff4422', '#e6002e']))
    expect(c < 20 || c > 340).toBe(true)
  })
  test('pale tints are not legible on white; dark ones are not legible on dark', () => {
    expect(legible('#fffbcc', false)).toBe(false)
    expect(legible('#1a0a00', true)).toBe(false)
    expect(legible('#e8462f', false)).toBe(true)
  })
  test('the window never spans a rainbow', () => {
    const pool = hueWindow(sw(['#e8462f', '#ff8e00', '#2b6cff', '#22aa55', '#d34d63', '#c2410c', '#b91c1c', '#ea580c']), [], false)
    expect(pool.map(p => p[0])).not.toContain('#2b6cff')
    expect(pool.map(p => p[0])).not.toContain('#22aa55')
  })
})
