// lib/theme-tokens.ts
// Pure token-kit builders (no react): OKLCH custom properties, Tailwind v4
// @theme, tokens.json. Shared by the panel footer and any test or script.

export interface TokenColorRow {
  hex_value: string
  oklch: string | null
}

export interface TokenTypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

export function themeSlug(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-') || 'custom'
}

function lightnessOf(c: TokenColorRow): number {
  if (c.oklch) {
    const m = c.oklch.match(/oklch\(\s*([\d.]+)/)
    if (m) return parseFloat(m[1])
  }
  return 0.5
}

function colorValue(c: TokenColorRow): string {
  return c.oklch ?? c.hex_value
}

const SANS_FALLBACK = 'ui-sans-serif, system-ui, sans-serif'
const MONO_FALLBACK = 'ui-monospace, monospace'

function fontStack(t: TokenTypographyRow): string {
  const fallback = t.role === 'mono' ? MONO_FALLBACK : SANS_FALLBACK
  return `"${t.font_family}", ${fallback}`
}

/** Palette sorted light → dark with stable token names both exports share. */
export function tokenColors(colors: TokenColorRow[]): Array<{ name: string; value: string }> {
  return [...colors]
    .sort((a, b) => lightnessOf(b) - lightnessOf(a))
    .map((c, i) => ({ name: `brand-${i + 1}`, value: colorValue(c) }))
}

export function tokenFonts(typography: TokenTypographyRow[]): Array<{ name: string; stack: string; weight: number | null }> {
  const order = ['heading', 'body', 'mono']
  return [...typography]
    .sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))
    .filter(t => t.font_family)
    .map(t => ({ name: themeSlug(t.role), stack: fontStack(t), weight: t.primary_weight }))
}

export function buildCssVars(
  colors: TokenColorRow[],
  typography: TokenTypographyRow[],
  fontImport: string | null,
): string {
  const lines = [
    ...(fontImport ? [`@import url('${fontImport}');`, ''] : []),
    ':root {',
    ...tokenColors(colors).map(c => `  --color-${c.name}: ${c.value};`),
    ...tokenFonts(typography).map(f => `  --font-${f.name}: ${f.stack};`),
    '}',
  ]
  return lines.join('\n')
}

/**
 * Tailwind v4 theme block. Drops into any v4 project under
 * `@import "tailwindcss";` and compiles to bg-brand-1, font-heading, etc.
 */
export function buildTailwindTheme(
  colors: TokenColorRow[],
  typography: TokenTypographyRow[],
  fontImport: string | null,
): string {
  const lines = [
    ...(fontImport ? [`@import url('${fontImport}');`] : []),
    '@import "tailwindcss";',
    '',
    '@theme {',
    ...tokenColors(colors).map(c => `  --color-${c.name}: ${c.value};`),
    ...tokenFonts(typography).map(f => `  --font-${f.name}: ${f.stack};`),
    '}',
  ]
  return lines.join('\n')
}

export function buildTokensJson(
  source: { url: string; title: string },
  colors: TokenColorRow[],
  typography: TokenTypographyRow[],
): string {
  const colorEntries: Record<string, { value: string; $type: string }> = {}
  for (const c of tokenColors(colors)) colorEntries[c.name] = { value: c.value, $type: 'color' }
  const fontEntries: Record<string, { value: string; $type: string; weight?: number | null }> = {}
  for (const f of tokenFonts(typography)) {
    fontEntries[f.name] = { value: f.stack, $type: 'fontFamily', ...(f.weight != null ? { weight: f.weight } : {}) }
  }
  return JSON.stringify(
    {
      $meta: { source: source.url, title: source.title, generator: "hitman's library" },
      color: colorEntries,
      font: fontEntries,
    },
    null,
    2,
  )
}

