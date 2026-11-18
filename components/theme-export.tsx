// components/theme-export.tsx
// Token kit export (cheap, no dependencies): the site's palette and type as
// OKLCH CSS custom properties, a Tailwind v4 @theme block, and a tokens.json
// download. Pure string building from rows the panel already holds — no
// network, no model, nothing to fail.
'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CaretDown, Check, Copy, DownloadSimple } from '@phosphor-icons/react'
import { CARD } from '@/components/member-card'
import { MENU } from '@/lib/motion'

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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey) }
  }, [open])

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

  const items = [
    { id: 'css', label: 'CSS variables', hint: 'OKLCH', Icon: Copy, run: () => copyText(buildCssVars(colors, typography, fontImport, siteUrl), 'css') },
    { id: 'tw', label: 'Tailwind theme', hint: 'v4', Icon: Copy, run: () => copyText(buildTailwindTheme(colors, typography, fontImport, siteUrl), 'tw') },
    { id: 'json', label: 'tokens.json', hint: 'Download', Icon: DownloadSimple, run: download },
  ]

  // One button, one small menu above it: the footer stays a single quiet line.
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={CARD.footBtn}
      >
        {copy.copiedId ? <Check className="w-3.5 h-3.5" weight="bold" /> : <Copy className="w-3.5 h-3.5" />}
        {copy.copiedId === 'json' ? 'Saved' : copy.copiedId ? 'Copied' : 'Copy theme'}
        <CaretDown className="w-3 h-3 text-ink-4" weight="bold" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            key="export-menu"
            role="menu"
            {...MENU}
            style={{ transformOrigin: 'bottom left' }}
            className={CARD.shell + ' absolute left-0 bottom-[calc(100%+8px)] z-50 w-[240px] shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.head}><span>Copy theme</span><span className="text-ink-4">{colors.length} colours</span></div>
            <div className="p-1.5">
              {items.map(({ id, label, hint, Icon, run }) => (
                <button
                  key={id}
                  role="menuitem"
                  onClick={() => { run(); setOpen(false) }}
                  className="w-full h-9 px-2.5 flex items-center gap-2.5 rounded-[10px] text-left text-[13.5px] font-[500] text-ink hover:bg-foreground/[0.045] focus-visible:bg-foreground/[0.045] outline-none transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-ink-3" weight="bold" />
                  <span className="flex-1">{label}</span>
                  <span className="text-[12px] text-ink-4">{hint}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
