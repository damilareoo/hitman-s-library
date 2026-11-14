import { describe, expect, test } from 'bun:test'
import { computeTrends, isSerif, hueFamily } from './compute'

let n = 0
const site = (daysAgo: number, fonts: string[], colors: string[], kind = 'Studio') =>
  ({ id: ++n, slug: `site${n}.com`, thumb: `https://x/${n}.webp`, addedAt: new Date(Date.UTC(2026, 10, 14) - daysAgo * 864e5).toISOString(), fonts, colors, kind })

describe('isSerif', () => {
  test('known serifs and "Serif" in the name', () => {
    expect(isSerif('Instrument Serif')).toBe(true)
    expect(isSerif('Playfair Display')).toBe(true)
    expect(isSerif('Inter')).toBe(false)
    expect(isSerif('IBM Plex Sans')).toBe(false)
  })
})

describe('hueFamily', () => {
  test('vivid colours get a family; greys are neutral', () => {
    expect(hueFamily('#ff5526')).toBe('Orange')
    expect(hueFamily('#2b6cff')).toBe('Blue')
    expect(hueFamily('#9a9a9a')).toBe('Neutral')
  })
})

describe('computeTrends', () => {
  const now = new Date(Date.UTC(2026, 10, 14))
  const sites = [
    site(3, ['Instrument Serif', 'Inter'], ['#ffffff', '#111111', '#ff5526']),
    site(5, ['Playfair Display'], ['#0a0a0a', '#ffffff', '#ff6a00']),
    site(10, ['Inter'], ['#ffffff', '#111111', '#2b6cff']),
    site(60, ['Inter'], ['#ffffff', '#111111', '#2b6cff']),
    site(70, ['Inter'], ['#ffffff', '#222222', '#2b6cff']),
    site(80, ['Geist'], ['#ffffff', '#222222', '#6b21ff']),
  ]
  const t = computeTrends(sites, now)
  test('compares the last 30 days with everything added before', () => {
    expect(t.recentCount).toBe(3)
    expect(t.earlierCount).toBe(3)
  })
  test('serif share rises when recent sites use more serifs', () => {
    expect(t.serif.recent).toBeCloseTo(2 / 3)
    expect(t.serif.earlier).toBeCloseTo(0)
  })
  test('top fonts are counted per site, most first; system fallbacks never count', () => {
    expect(t.fonts[0]).toMatchObject({ name: 'Inter', recent: 2, earlier: 2 })
    const withFallback = computeTrends([site(1, ['SFMono-Regular', 'Georgia', 'Satoshi'], ['#ffffff'])], now)
    expect(withFallback.fonts.map(f => f.name)).toEqual(['Satoshi'])
    expect(withFallback.serif.recent).toBe(0)
  })
  test('accent families: orange up, blue down', () => {
    const orange = t.hues.find(h => h.name === 'Orange')!
    const blue = t.hues.find(h => h.name === 'Blue')!
    expect(orange.recent).toBeGreaterThan(orange.earlier)
    expect(blue.recent).toBeLessThan(blue.earlier)
  })
  test('dark share: a site whose largest colour is dark', () => expect(t.dark.recent).toBeCloseTo(1 / 3))
  test('each typeface and colour row brings up to three of the newest sites as examples', () => {
    const inter = t.fonts.find(f => f.name === 'Inter')!
    expect(inter.examples.map(e => e.slug)).toEqual(['site1.com', 'site3.com'])
    const orange = t.hues.find(h => h.name === 'Orange')!
    expect(orange.examples.length).toBe(2)
    expect(orange.hex).toMatch(/^#[0-9a-f]{6}$/)
  })
  test('the report no longer carries kinds of site (they follow our curation)', () => {
    expect('kinds' in t).toBe(false)
  })
})
