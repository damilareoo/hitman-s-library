// lib/kit/kit.ts
//
// The style kit's text files, built from database rows with plain templates:
// no model, no network, so a kit costs nothing to make. The CSS, Tailwind and
// tokens.json files are the same free exports the panel already copies.
import type { SiteDetail } from '@/lib/read/site-detail'
import { buildCssVars, buildTailwindTheme, buildTokensJson, tokenColors, tokenFonts, themeSlug } from '@/lib/theme-tokens'
import { colorRoles } from './roles'

export interface KitFile { name: string; content: string }

const md = (s: string) => s.replace(/([\\|*_`[\]<>#])/g, '\\$1')
const pct = (n: number | null) => (n == null ? '' : `${Math.round(n * 1000) / 10}%`)

/** Token name → its row, in the order the free exports use. */
function named(site: SiteDetail) {
  return tokenColors(site.colors).map(t => ({
    name: t.name,
    row: site.colors.find(c => (c.oklch ?? c.hex_value) === t.value)!,
  }))
}

function designMd(site: SiteDetail): string {
  const roles = colorRoles(site.colors)
  const out = [
    `# ${md(site.title)}`,
    '',
    `Design tokens measured from ${site.url} by Hitman's Library.`,
    'Use these values as the source of truth when building in this style: the palette with its roles, and the type.',
  ]
  if (site.colors.length) {
    out.push('', '## Palette', '', '| Token | Role | Hex | OKLCH | Share of page |', '| --- | --- | --- | --- | --- |')
    for (const { name, row } of named(site)) {
      out.push(`| ${name} | ${roles.get(row.hex_value)} | ${row.hex_value.toLowerCase()} | ${row.oklch ?? ''} | ${pct(row.area_share)} |`)
    }
  }
  if (site.typography.some(t => t.font_family)) {
    out.push('', '## Type', '', '| Role | Family | Weight | Size | Line height | Source |', '| --- | --- | --- | --- | --- | --- |')
    for (const t of site.typography.filter(t => t.font_family)) {
      const size = t.sample_size_px ? `${t.sample_size_px}px` : ''
      out.push(`| ${t.role} | ${md(t.font_family)} | ${t.primary_weight ?? ''} | ${size} | ${t.sample_line_height ?? ''} | ${t.google_fonts_url ?? ''} |`)
    }
  }
  out.push('', '## Files', '', '- `theme.css`: CSS custom properties', '- `tailwind.css`: a Tailwind v4 `@theme` block', '- `tokens.json` and `figma-variables.json`: design tokens (import the latter into Figma variables)', '')
  return out.join('\n')
}

function figmaVariables(site: SiteDetail): string {
  const out: Record<string, unknown> = {}
  if (site.colors.length) {
    out.color = Object.fromEntries(named(site).map(({ name, row }) => [name, { $type: 'color', $value: row.hex_value.toLowerCase() }]))
  }
  const fonts = tokenFonts(site.typography)
  if (fonts.length) {
    out.font = Object.fromEntries(fonts.map(f => [f.name, {
      $type: 'fontFamily',
      $value: site.typography.find(t => themeSlug(t.role) === f.name)?.font_family ?? f.stack,
    }]))
  }
  return JSON.stringify(out, null, 2)
}

export function buildKitFiles(site: SiteDetail): KitFile[] {
  const files: KitFile[] = [{ name: 'DESIGN.md', content: designMd(site) }]
  if (!site.colors.length && !site.typography.length) return files
  const fontImport = site.typography.map(t => t.google_fonts_url).find((u): u is string => Boolean(u)) ?? null
  files.push(
    { name: 'figma-variables.json', content: figmaVariables(site) },
    { name: 'theme.css', content: buildCssVars(site.colors, site.typography, fontImport) },
    { name: 'tailwind.css', content: buildTailwindTheme(site.colors, site.typography, fontImport) },
    { name: 'tokens.json', content: buildTokensJson({ url: site.url, title: site.title }, site.colors, site.typography) },
  )
  return files
}
