// components/theme-export.tsx
// Token kit export (cheap, no dependencies): the site's palette and type as
// OKLCH CSS custom properties, a Tailwind v4 @theme block, and a tokens.json
// download. Pure string building from rows the panel already holds — no
// network, no model, nothing to fail.
'use client'

import { Check, Copy, DownloadSimple } from '@phosphor-icons/react'
import { CARD } from '@/components/member-card'

import { useSoundsContext } from '@/contexts/sounds-context'
import { useCopied } from '@/lib/use-copied'
import { track } from '@/lib/analytics'
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
      track('theme_exported', { format: id })
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
      track('theme_exported', { format: 'tokens_json' })
      playCopy()
      copy.markCopied('json')
    } catch { /* download unavailable */ }
  }

  const done = (id: string) => copy.copiedId === id
  const mark = (id: string, Icon: typeof Copy) => done(id)
    ? <Check className="w-3.5 h-3.5" weight="bold" />
    : <Icon className="w-3.5 h-3.5" weight="bold" />

  // Three labelled buttons: each says what it does, in the footer's own register.
  return (
    <div className="flex items-center gap-0.5 min-w-0" role="group" aria-label="Copy theme">
      <button
        type="button"
        onClick={() => copyText(buildCssVars(colors, typography, fontImport, siteUrl), 'css')}
        className={CARD.footBtn}
        title="Copy OKLCH custom properties"
      >
        {mark('css', Copy)}{done('css') ? 'Copied' : 'Copy CSS'}
      </button>
      <button
        type="button"
        onClick={() => copyText(buildTailwindTheme(colors, typography, fontImport, siteUrl), 'tw')}
        className={CARD.footBtn}
        title="Copy Tailwind v4 @theme block"
      >
        {mark('tw', Copy)}{done('tw') ? 'Copied' : 'Copy Tailwind'}
      </button>
      <button
        type="button"
        onClick={download}
        className={CARD.footBtn}
        title="Download tokens.json"
      >
        {mark('json', DownloadSimple)}{done('json') ? 'Saved' : 'tokens.json'}
      </button>
    </div>
  )
}
