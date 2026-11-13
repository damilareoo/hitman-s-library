import { describe, expect, test } from 'bun:test'
import { buildKitFiles } from './kit'
import { colorRoles, parseOklch } from './roles'
import type { SiteDetail } from '@/lib/read/site-detail'

const SITE: SiteDetail = {
  id: 7, url: 'https://goodside.studio/', title: 'Good | Side *Studio*',
  screenshot_url: 'https://x/a.png', mobile_screenshot_url: null, live_preview: true,
  created_at: '2026-11-11T00:00:00Z', extraction_error: null, motion_clip_url: null, motion_error: null,
  favorite_count: 0,
  colors: [
    { hex_value: '#F7F4EE', oklch: 'oklch(96.5% 0.01 85)', area_share: 0.62 },
    { hex_value: '#111111', oklch: 'oklch(17.8% 0 0)', area_share: 0.2 },
    { hex_value: '#E8462F', oklch: 'oklch(63% 0.2 33)', area_share: 0.05 },
  ],
  typography: [
    { font_family: 'Instrument Serif', role: 'heading', google_fonts_url: 'https://fonts.googleapis.com/css2?family=Instrument+Serif', primary_weight: 400, sample_size_px: 64, sample_line_height: 1.1 },
    { font_family: 'Inter', role: 'body', google_fonts_url: null, primary_weight: 400, sample_size_px: 16, sample_line_height: '1.5' },
  ],
}

describe('roles', () => {
  test('parses percent and unit lightness', () => {
    expect(parseOklch('oklch(63% 0.2 33)')).toEqual({ l: 0.63, c: 0.2, h: 33 })
    expect(parseOklch('oklch(0.63 0.2 33)')).toEqual({ l: 0.63, c: 0.2, h: 33 })
    expect(parseOklch(null)).toBeNull()
  })
  test('largest light colour is background, darkest is text, most chromatic is accent', () => {
    const r = colorRoles(SITE.colors)
    expect(r.get('#F7F4EE')).toBe('background')
    expect(r.get('#111111')).toBe('text')
    expect(r.get('#E8462F')).toBe('accent')
  })
})

describe('buildKitFiles', () => {
  const files = buildKitFiles(SITE)
  const get = (n: string) => files.find(f => f.name === n)!.content
  test('five files', () => expect(files.map(f => f.name)).toEqual(['DESIGN.md', 'figma-variables.json', 'theme.css', 'tailwind.css', 'tokens.json']))
  test('DESIGN.md names the source and every hex', () => {
    const md = get('DESIGN.md')
    expect(md).toContain('https://goodside.studio/')
    for (const c of SITE.colors) expect(md).toContain(c.hex_value.toLowerCase())
    expect(md).toContain('| background |')
    expect(md).toContain('Instrument Serif')
    expect(md).toContain('64px')
  })
  test('markdown characters in the title are escaped', () => {
    const md = get('DESIGN.md')
    expect(md).toContain('Good \\| Side \\*Studio\\*')
  })
  test('figma variables are DTCG with sRGB hex', () => {
    const j = JSON.parse(get('figma-variables.json'))
    expect(j.color['brand-1'].$type).toBe('color')
    expect(j.color['brand-1'].$value).toMatch(/^#[0-9a-f]{6}$/)
    expect(j.font.heading.$value).toBe('Instrument Serif')
  })
  test('no fonts: no Type section and no font group', () => {
    const f = buildKitFiles({ ...SITE, typography: [] })
    const md = f.find(x => x.name === 'DESIGN.md')!.content
    expect(md).not.toContain('## Type')
    expect(JSON.parse(f.find(x => x.name === 'figma-variables.json')!.content).font).toBeUndefined()
  })
  test('no colours and no fonts: DESIGN.md only', () => {
    expect(buildKitFiles({ ...SITE, colors: [], typography: [] }).map(f => f.name)).toEqual(['DESIGN.md'])
  })
})
