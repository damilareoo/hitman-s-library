// components/theme-export.tsx
// Token kit export (cheap, no dependencies): the site's palette and type as
// OKLCH CSS custom properties, a Tailwind v4 @theme block, and a tokens.json
// download. Pure string building from rows the panel already holds — no
// network, no model, nothing to fail.
'use client'

import { useSoundsContext } from '@/contexts/sounds-context'
import { useCopied } from '@/lib/use-copied'
import posthog from 'posthog-js'
import {
  buildCssVars,
  buildTailwindTheme,
  buildTokensJson,
  themeSlug,
  type TokenColorRow as ColorRow,
  type TokenTypographyRow as TypographyRow,
} from '@/lib/theme-tokens'

export function ThemeExport({
  siteUrl,
  siteTitle,
  colors,
  typography,
}: {
  siteUrl: string
  siteTitle: string
  colors: ColorRow[]
  typography: TypographyRow[]
}) {
  const copy = useCopied()
  const { playCopy } = useSoundsContext()

  if (colors.length === 0 && typography.length === 0) return null

  // One font import for the whole kit: the first Google Fonts URL the
  // extraction recorded. CSS @imports must lead, so builders prepend it.
  const fontImport = typography.map(t => t.google_fonts_url).find((u): u is string => Boolean(u)) ?? null

  async function copyText(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text)
      posthog.capture('theme_exported', { format: id })
      playCopy()
      copy.markCopied(id)
    } catch { /* clipboard unavailable */ }
  }

  function download() {
    try {
      const blob = new Blob(
        [buildTokensJson({ url: siteUrl, title: siteTitle }, colors, typography)],
        { type: 'application/json' },
      )
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `tokens-${themeSlug(siteTitle)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(a.href), 5000)
      posthog.capture('theme_exported', { format: 'tokens_json' })
      playCopy()
      copy.markCopied('json')
    } catch { /* download unavailable */ }
  }

  const btn =
    'px-2.5 h-7 rounded-[4px] text-micro transition-colors flex items-center gap-1.5 ' +
    'text-ink-4 hover:text-ink hover:bg-muted active:scale-[0.98]'

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Copy theme">
      <button
        type="button"
        onClick={() => copyText(buildCssVars(colors, typography, fontImport), 'css')}
        className={btn}
        title="Copy OKLCH custom properties"
      >
        {copy.copiedId === 'css' ? 'Copied' : 'CSS'}
      </button>
      <button
        type="button"
        onClick={() => copyText(buildTailwindTheme(colors, typography, fontImport), 'tw')}
        className={btn}
        title="Copy Tailwind v4 @theme block"
      >
        {copy.copiedId === 'tw' ? 'Copied' : '@theme'}
      </button>
      <button
        type="button"
        onClick={download}
        className={btn}
        title="Download tokens.json"
      >
        {copy.copiedId === 'json' ? 'Saved' : 'tokens.json'}
      </button>
    </div>
  )
}
