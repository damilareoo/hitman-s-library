'use client'

import { useEffect, useState } from 'react'
import { Copy, Check, ArrowSquareOut } from '@phosphor-icons/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { getFontSource } from '@/lib/font-sources'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

const ROLE_LABEL: Record<string, string> = {
  heading: 'Display',
  body: 'Text',
  mono: 'Mono',
  legacy: 'Detected',
}

const FALLBACK: Record<string, string> = {
  heading: 'sans-serif',
  body: 'sans-serif',
  mono: 'monospace',
}

const SAMPLE: Record<string, string> = {
  heading: 'The quick brown fox jumps over the lazy dog',
  body: 'Designers make decisions that shape how people experience the world.',
  mono: 'const design = () => "visual language"',
}

const GLYPHS: Record<string, string> = {
  heading: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii 0 1 2 3',
  body: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii 0 1 2 3',
  mono: '0 1 2 3 4 5 6 7 8 9  { }  [ ]  ( )',
}

export function TypeSpecimenCard({ typography, index }: { typography: TypographyRow; index: number }) {
  const [fontLoaded, setFontLoaded] = useState(!typography.google_fonts_url)
  const [copied, setCopied] = useState(false)
  const { playCopy } = useSoundsContext()

  useEffect(() => {
    if (!typography.google_fonts_url) { setFontLoaded(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = typography.google_fonts_url
    link.onload = () => setFontLoaded(true)
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [typography.google_fonts_url])

  const weight = typography.primary_weight ?? (typography.role === 'heading' ? 700 : 400)
  const fontFamily = `"${typography.font_family}", ${FALLBACK[typography.role] ?? 'sans-serif'}`
  const sample = SAMPLE[typography.role] ?? SAMPLE.body
  const glyphs = GLYPHS[typography.role] ?? GLYPHS.heading
  const isMono = typography.role === 'mono'

  const isGoogleFont = Boolean(typography.google_fonts_url)
  const source = isGoogleFont
    ? { name: 'Google Fonts', url: typography.google_fonts_url!, type: 'free' as const }
    : getFontSource(typography.font_family)

  const specimenSize = typography.role === 'heading' ? 66 : isMono ? 32 : 46
  const specimenTracking = typography.role === 'heading' ? '-0.03em' : isMono ? '0.01em' : '-0.02em'

  function handleCopy() {
    navigator.clipboard.writeText(typography.font_family).then(() => {
      playCopy()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div
      className="px-5 pt-7 pb-6 border-b border-border/20 last:border-0 group"
      style={{ opacity: 0, animation: `fade-in-up 0.35s cubic-bezier(0.22,1,0.36,1) ${index * 70}ms both` }}
    >

      {/* Specimen — font name at display scale, leads the card */}
      <div
        className="mb-2 transition-opacity duration-500"
        style={{
          fontFamily,
          fontSize: specimenSize,
          fontWeight: weight,
          lineHeight: 0.88,
          letterSpacing: specimenTracking,
          opacity: fontLoaded ? 1 : 0.06,
        }}
      >
        {typography.font_family}
      </div>

      {/* Caption row — role under the specimen, icons slide in on hover */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-[8px] font-mono uppercase tracking-[0.2em] text-muted-foreground/25">
          {ROLE_LABEL[typography.role] ?? typography.role}
          {!fontLoaded && <span className="ml-2 animate-pulse">·</span>}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {typography.google_fonts_url && (
            <a
              href={typography.google_fonts_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 flex items-center justify-center text-muted-foreground/30 hover:text-foreground transition-colors"
              title="View on Google Fonts"
            >
              <ArrowSquareOut className="w-3 h-3" weight="regular" />
            </a>
          )}
          <button
            onClick={handleCopy}
            className="w-6 h-6 flex items-center justify-center text-muted-foreground/30 hover:text-foreground transition-colors"
            title="Copy font name"
          >
            {copied
              ? <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
              : <Copy className="w-3 h-3" weight="regular" />}
          </button>
        </div>
      </div>

      {/* Sample sentence */}
      <p
        className="leading-[1.55] mb-4 transition-opacity duration-500"
        style={{
          fontFamily,
          fontSize: isMono ? 10.5 : 12.5,
          fontWeight: isMono ? 400 : Math.min(weight, 450),
          color: 'oklch(from var(--muted-foreground) l c h / 0.45)',
          opacity: fontLoaded ? 1 : 0.04,
        }}
      >
        {sample}
      </p>

      {/* Glyph strip */}
      <p
        className="mb-5 transition-opacity duration-500"
        style={{
          fontFamily,
          fontSize: 9,
          letterSpacing: '0.14em',
          color: 'oklch(from var(--muted-foreground) l c h / 0.18)',
          opacity: fontLoaded ? 1 : 0.03,
        }}
      >
        {glyphs}
      </p>

      {/* Footer — weight + foundry on one line */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-mono text-muted-foreground/25 tabular-nums">
          {weight}
        </span>

        {source && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group/src min-w-0"
          >
            <span className={[
              'shrink-0 text-[7.5px] font-mono uppercase tracking-[0.1em] px-1.5 py-[3px] rounded-[2px]',
              source.type === 'free'
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]/70'
                : 'bg-muted/60 text-muted-foreground/35',
            ].join(' ')}>
              {source.type === 'free' ? 'free' : 'paid'}
            </span>
            <span className="text-[9px] font-mono text-muted-foreground/30 group-hover/src:text-muted-foreground/70 transition-colors truncate">
              {source.name}
            </span>
            <ArrowSquareOut className="w-2.5 h-2.5 shrink-0 text-muted-foreground/20 group-hover/src:text-muted-foreground/50 transition-colors" weight="regular" />
          </a>
        )}
      </div>
    </div>
  )
}
