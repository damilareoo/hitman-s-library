import { describe, expect, test } from 'bun:test'
import { getSiteDetail, type SiteDetailDeps } from './site-detail'

const SOURCE = {
  id: 798, source_url: 'https://goodside.studio/', source_name: 'Goodside',
  screenshot_url: 'http://x.public.blob.vercel-storage.com/a.jpg', mobile_screenshot_url: null,
  created_at: '2026-11-11T13:20:00.858Z', extraction_error: null, live_preview: true,
  motion_error: null, current_extraction_id: 55, motion_clip_url: null,
}
const LEGACY_COLORS = [{ hex_value: '#000000', oklch: 'oklch(0% 0 0)', area_share: 0.5 }]
const TYPE_ROWS = [{ font_family: 'Instrument Serif', role: 'heading', google_fonts_url: null, primary_weight: 400, sample_size_px: 64, sample_line_height: 1.1 }]

function deps(opts: { source?: any; palette?: any[]; typography?: any[] } = {}): SiteDetailDeps {
  const sql: any = (strings: TemplateStringsArray) => {
    const q = strings.join('?')
    if (q.includes('FROM design_sources')) return Promise.resolve(opts.source === null ? [] : [opts.source ?? SOURCE])
    if (q.includes('FROM design_colors')) return Promise.resolve(LEGACY_COLORS)
    if (q.includes('FROM design_typography')) return Promise.resolve(TYPE_ROWS)
    throw new Error('unexpected query ' + q)
  }
  return {
    sql,
    favoriteCounts: async () => new Map([[798, 3]]),
    getHistoriesByIds: async () => new Map([[55, {
      palette: opts.palette ?? [], typography: opts.typography ?? [],
      screenshot_url: null, mobile_screenshot_url: null,
    } as any]]),
  }
}

describe('getSiteDetail', () => {
  test('a missing site is null', async () => {
    expect(await getSiteDetail(1, deps({ source: null }))).toBeNull()
  })
  test('an empty snapshot palette keeps the legacy colours', async () => {
    const d = await getSiteDetail(798, deps())
    expect(d!.colors).toEqual(LEGACY_COLORS)
  })
  test('a snapshot palette wins over legacy colours', async () => {
    const d = await getSiteDetail(798, deps({ palette: [{ hex: '#ff0000', oklch: 'oklch(62% .25 29)', area_share: 0.2 }] }))
    expect(d!.colors).toEqual([{ hex_value: '#ff0000', oklch: 'oklch(62% .25 29)', area_share: 0.2 }])
  })
  test('screenshots are upgraded to https and favourites counted', async () => {
    const d = await getSiteDetail(798, deps())
    expect(d!.screenshot_url!.startsWith('https://')).toBe(true)
    expect(d!.favorite_count).toBe(3)
    expect(d!.typography[0].font_family).toBe('Instrument Serif')
  })
})
