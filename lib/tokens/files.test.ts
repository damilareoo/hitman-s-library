import { describe, expect, test } from 'bun:test'
import { buildTokenFiles } from './files'
import { colorRoles } from './roles'
import { hexToOklch, formatOklch, contrastRatio } from './color'
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
  test('OKLCH from hex', () => {
    expect(formatOklch(hexToOklch('#ffffff'))).toBe('oklch(100% 0 0)')
    expect(formatOklch(hexToOklch('#000000'))).toBe('oklch(0% 0 0)')
    expect(formatOklch(hexToOklch('#ff8e00'))).toBe('oklch(75.4% 0.178 59.2)')
  })
  test('WCAG contrast', () => expect(contrastRatio('#ffffff', '#000000')).toBe(21))
  test('largest light colour is background, darkest is text, most chromatic is accent', () => {
    const r = colorRoles(SITE.colors)
    expect(r.get('#f7f4ee')).toBe('background')
    expect(r.get('#111111')).toBe('text')
    expect(r.get('#e8462f')).toBe('accent')
  })
})

describe('kit quality', () => {
  const MESSY: SiteDetail = { ...SITE, colors: [
    { hex_value: '#FFFFFF', oklch: 'oklch(1.0000000000000002 4.996003610813204e-16 180)', area_share: null },
    { hex_value: '#8E8E8E', oklch: 'oklch(0.6467273699038915 0 none)', area_share: null },
    { hex_value: '#FF8E00', oklch: 'oklch(0.7537600025417516 0.17811387757666836 59.214966475833336)', area_share: null },
    { hex_value: '#4DAFFF', oklch: 'oklch(0.7309513309869552 0.14804087345888406 246.43803483703434)', area_share: null },
    { hex_value: '#FF0D8A', oklch: 'oklch(0.6504850310182575 0.26041002020234816 359.5917208576317)', area_share: null },
    { hex_value: '#000000', oklch: 'oklch(0 0 none)', area_share: null },
  ], typography: [
    { font_family: 'true', role: 'body', google_fonts_url: null, primary_weight: 400, sample_size_px: null, sample_line_height: null },
    { font_family: 'DM Mono', role: 'mono', google_fonts_url: null, primary_weight: 400, sample_size_px: null, sample_line_height: null },
  ] }
  const files = buildTokenFiles(MESSY)
  const md = files.find(f => f.name === 'DESIGN.md')!.content
  test('OKLCH is rounded and readable', () => {
    expect(md).toContain('oklch(100% 0 0)')
    expect(md).toContain('oklch(75.4% 0.178 59.2)')
    expect(md).not.toMatch(/\de-\d|\bnone\b|\.\d{4,}/)
  })
  test('tokens are named for what they are', () => {
    const css = files.find(f => f.name === 'theme.css')!.content
    expect(css).toContain('--color-background: #ffffff')
    expect(css).toContain('--color-text: #000000')
    expect(css).toContain('--color-accent: #ff0d8a')
    expect(css).toContain('--color-orange-400: #ff8e00')
    expect(css).toContain('--color-blue-')
    expect(css).toContain('--color-neutral-')
    expect(css).not.toContain('brand-')
  })
  test('junk font names are dropped', () => {
    expect(md).not.toContain('| true |')
    expect(md).toContain('DM Mono')
  })
  test('an all-empty share column is left out', () => expect(md).not.toContain('Share of page'))
  test('it opens with how to use it, in plain words', () => {
    expect(md).toMatch(/## How to use this kit/)
    expect(md).toContain('Figma')
    expect(md).toContain('Claude')
  })
})

describe('buildTokenFiles', () => {
  const files = buildTokenFiles(SITE)
  const get = (n: string) => files.find(f => f.name === n)!.content
  test('five files', () => expect(files.map(f => f.name)).toEqual(['DESIGN.md', 'figma-variables.json', 'theme.css', 'tailwind.css', 'tokens.json']))
  test('DESIGN.md names the source and every hex', () => {
    const md = get('DESIGN.md')
    expect(md).toContain('https://goodside.studio/')
    for (const c of SITE.colors) expect(md).toContain(c.hex_value.toLowerCase())
    expect(md).toContain('| background | background | #f7f4ee |')
    expect(md).toContain('Instrument Serif')
    expect(md).toContain('64px')
  })
  test('markdown characters in the title are escaped', () => {
    const md = get('DESIGN.md')
    expect(md).toContain('Good \\| Side \\*Studio\\*')
  })
  test('figma variables are DTCG with sRGB hex', () => {
    const j = JSON.parse(get('figma-variables.json'))
    expect(j.color.background.$type).toBe('color')
    expect(j.color.background.$value).toBe('#f7f4ee')
    expect(j.font.heading.$value).toBe('Instrument Serif')
  })
  test('no fonts: no Type section and no font group', () => {
    const f = buildTokenFiles({ ...SITE, typography: [] })
    const md = f.find(x => x.name === 'DESIGN.md')!.content
    expect(md).not.toContain('## Type')
    expect(JSON.parse(f.find(x => x.name === 'figma-variables.json')!.content).font).toBeUndefined()
  })
  test('no colours and no fonts: DESIGN.md only', () => {
    expect(buildTokenFiles({ ...SITE, colors: [], typography: [] }).map(f => f.name)).toEqual(['DESIGN.md'])
  })
})

import { describe as d2, test as t2, expect as e2 } from 'bun:test'
import { buildTokenFiles as build2 } from './files'
d2('font fallbacks follow the face', () => {
  t2('a serif heading falls back to serif, a mono to monospace', () => {
    const site = { id: 1, url: 'https://x.com', title: 'X', screenshot_url: null, mobile_screenshot_url: null, live_preview: true, created_at: '', extraction_error: null, motion_clip_url: null, motion_error: null, favorite_count: 0,
      colors: [{ hex_value: '#ffffff', oklch: null, area_share: 0.9 }, { hex_value: '#111111', oklch: null, area_share: 0.1 }],
      typography: [
        { font_family: 'Instrument Serif', role: 'heading', google_fonts_url: null, primary_weight: 400, sample_size_px: 48, sample_line_height: null },
        { font_family: 'Geist Mono', role: 'mono', google_fonts_url: null, primary_weight: 400, sample_size_px: 13, sample_line_height: null },
      ] }
    const css = build2(site as never).find(f => f.name === 'theme.css')!.content
    e2(css).toContain('"Instrument Serif", ui-serif, Georgia, serif')
    e2(css).toContain('"Geist Mono", ui-monospace, monospace')
  })
})
