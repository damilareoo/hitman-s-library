// lib/tokens/files.ts
//
// The style kit's text files, built from database rows with plain templates:
// no model, no network, so a kit costs nothing to make. Tokens are named for
// what they are (background, text, accent, orange-300, neutral-700), values
// are recomputed from hex so they're always clean, and DESIGN.md opens with
// how to use the kit in plain words.
import { isMono, isSerif } from './font-kind'
import type { SiteDetail } from '@/lib/read/site-detail'
import { nameColors, type NamedColor } from './roles'
import { contrastRatio } from './color'

export interface KitFile { name: string; content: string }
export interface KitFont { role: string; family: string; weight: number | null; size: number | null; lineHeight: string | null; source: string | null }

const md = (s: string) => s.replace(/([\\|*_`[\]<>#])/g, '\\$1')
const NOT_A_FONT = new Set(['true', 'false', 'null', 'undefined', 'inherit', 'initial', 'unset', 'normal', 'none'])
const GENERIC = new Set(['serif', 'sans-serif', 'monospace', 'system-ui', 'cursive', 'fantasy', 'ui-sans-serif', 'ui-serif', 'ui-monospace'])

export function kitFonts(site: SiteDetail): KitFont[] {
  const order = ['heading', 'body', 'mono']
  const seen = new Set<string>()
  return [...site.typography]
    .map(t => ({ ...t, family: (t.font_family ?? '').replace(/^["']|["']$/g, '').trim() }))
    .filter(t => t.family.length >= 2 && /[a-z]/i.test(t.family) && !NOT_A_FONT.has(t.family.toLowerCase()) && !GENERIC.has(t.family.toLowerCase()))
    .filter(t => { const k = t.role + '|' + t.family; if (seen.has(k)) return false; seen.add(k); return true })
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .map(t => ({
      role: t.role, family: t.family, weight: t.primary_weight,
      size: t.sample_size_px ?? null,
      lineHeight: t.sample_line_height == null ? null : String(t.sample_line_height),
      source: t.google_fonts_url,
    }))
}

const fallback = (f: KitFont) => (f.role === 'mono' || isMono(f.family) ? 'ui-monospace, monospace' : isSerif(f.family) ? 'ui-serif, Georgia, serif' : 'ui-sans-serif, system-ui, sans-serif')
const stack = (f: KitFont) => `"${f.family}", ${fallback(f)}`
const tokenRole = (role: string) => role.toLowerCase().replace(/[^a-z0-9-]/g, '') || 'text'

function summary(colors: NamedColor[], fonts: KitFont[]): string[] {
  const by = (r: string) => colors.find(c => c.role === r)
  const bg = by('background'), text = by('text'), accent = by('accent')
  const lines: string[] = []
  if (bg) lines.push(`- A ${bg.o.l >= 0.6 ? 'light' : 'dark'} site: background ${bg.hex}${text ? `, text ${text.hex}` : ''}${accent ? `, accent ${accent.hex}` : ''}.`)
  if (bg && text) {
    const ratio = contrastRatio(bg.hex, text.hex)
    lines.push(`- Text on background has a contrast of ${ratio}:1 (${ratio >= 7 ? 'passes WCAG AAA' : ratio >= 4.5 ? 'passes WCAG AA' : 'below WCAG AA for body text'}).`)
  }
  if (fonts.length) lines.push(`- Type: ${fonts.map(f => `${f.family} for ${f.role}`).join(', ')}.`)
  lines.push(`- ${colors.length} colours, ${fonts.length} ${fonts.length === 1 ? 'typeface' : 'typefaces'}.`)
  return lines
}

function designMd(site: SiteDetail, colors: NamedColor[], fonts: KitFont[]): string {
  const out = [
    `# ${md(site.title)}`,
    '',
    `A style kit from Hitman's Library, measured from ${site.url}`,
    '',
    '## How to use this kit',
    '',
    '- **With an AI tool** (Claude, Cursor, v0, Lovable): add this file to the chat and ask it to build in this style. It will use these exact colours and fonts.',
    '- **In Figma:** open the Variables panel, choose Import, and pick `figma-variables.json`.',
    '- **In code:** paste `theme.css` into any site, or `tailwind.css` into a Tailwind v4 project.',
    '- **For reference:** `desktop.png` and `mobile.png` show the site as captured.',
    '',
    '## At a glance',
    '',
    ...summary(colors, fonts),
  ]
  if (colors.length) {
    const share = colors.some(c => c.share != null)
    out.push('', '## Palette', '', `| Token | Role | Hex | OKLCH |${share ? ' Share of page |' : ''}`, `| --- | --- | --- | --- |${share ? ' --- |' : ''}`)
    for (const c of colors) {
      out.push(`| ${c.name} | ${c.role} | ${c.hex} | ${c.oklch} |${share ? ` ${c.share == null ? '' : `${Math.round(c.share * 1000) / 10}%`} |` : ''}`)
    }
  }
  if (fonts.length) {
    out.push('', '## Type', '', '| Role | Family | Weight | Size | Line height |', '| --- | --- | --- | --- | --- |')
    for (const f of fonts) out.push(`| ${f.role} | ${md(f.family)} | ${f.weight ?? ''} | ${f.size ? `${f.size}px` : ''} | ${f.lineHeight ?? ''} |`)
    const sources = fonts.filter(f => f.source)
    if (sources.length) out.push('', ...sources.map(f => `${md(f.family)}: ${f.source}`))
  }
  if (colors.length) {
    out.push('', '## Rules for building in this style', '')
    if (colors.some(c => c.role === 'background')) out.push('- Use `background` for large surfaces and `text` for body copy.')
    if (colors.some(c => c.role === 'accent')) out.push('- Keep `accent` for actions and highlights, not large areas.')
    out.push('- Use only the colours in this palette; pick neutrals for borders and secondary text.')
  }
  out.push('')
  return out.join('\n')
}

function cssBody(colors: NamedColor[], fonts: KitFont[]): string[] {
  return [
    ...colors.map(c => `  --color-${c.name}: ${c.hex}; /* ${c.oklch} */`),
    ...fonts.map(f => `  --font-${tokenRole(f.role)}: ${stack(f)};`),
  ]
}

function tokens(colors: NamedColor[], fonts: KitFont[], meta: Record<string, string> | null): string {
  const out: Record<string, unknown> = meta ? { $meta: meta } : {}
  if (colors.length) out.color = Object.fromEntries(colors.map(c => [c.name, meta
    ? { $type: 'color', $value: c.hex, $description: `${c.role} · ${c.oklch}` }
    : { $type: 'color', $value: c.hex }]))
  if (fonts.length) out.font = Object.fromEntries(fonts.map(f => [tokenRole(f.role), { $type: 'fontFamily', $value: f.family }]))
  return JSON.stringify(out, null, 2)
}

export function buildTokenFiles(site: SiteDetail): KitFile[] {
  const colors = nameColors(site.colors)
  const fonts = kitFonts(site)
  const files: KitFile[] = [{ name: 'DESIGN.md', content: designMd(site, colors, fonts) }]
  if (!colors.length && !fonts.length) return files
  const fontImport = fonts.map(f => f.source).find((u): u is string => Boolean(u && u.startsWith('https://'))) ?? null
  const head = fontImport ? [`@import url('${fontImport}');`] : []
  files.push(
    { name: 'figma-variables.json', content: tokens(colors, fonts, null) },
    { name: 'theme.css', content: [...head, ...(head.length ? [''] : []), ':root {', ...cssBody(colors, fonts), '}', ''].join('\n') },
    { name: 'tailwind.css', content: [...head, '@import "tailwindcss";', '', '@theme {', ...cssBody(colors, fonts), '}', ''].join('\n') },
    { name: 'tokens.json', content: tokens(colors, fonts, { source: site.url, title: site.title, generator: "Hitman's Library" }) },
  )
  return files
}
