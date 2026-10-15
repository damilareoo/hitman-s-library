'use client'

import { useEffect, useState } from 'react'
import { ArrowSquareOut, Check } from '@phosphor-icons/react'
import { getFontSource } from '@/lib/font-sources'
import { useSoundsContext } from '@/contexts/sounds-context'
import { useCopied } from '@/lib/use-copied'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
  sample_size_px?: number | null
  sample_line_height?: string | null
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

/**
 * A pangram earns its place over a lorem line: every letter appears, so the
 * shapes that distinguish one face from another are all on screen.
 */
const PANGRAM = 'Sphinx of black quartz, judge my vow.'
const MONO_LINE = 'const design = () => "visual language"'
const CHARSET = 'AaBbCcDdEeFfGg 0123456789 &@#$%'
const MONO_CHARSET = '{ } [ ] ( ) => !== 0O1lI'

/** Long enough for a webfont on a slow connection, short enough not to stall. */
const FONT_TIMEOUT_MS = 4000

/**
 * Families that are a stack rather than a face. "ui-monospace" resolves to
 * whatever the platform considers its monospace, which is the correct
 * rendering, not a substitution — so there is nothing to warn about.
 */
const GENERIC = new Set([
  'ui-monospace', 'ui-sans-serif', 'ui-serif', 'ui-rounded',
  'system-ui', '-apple-system', 'blinkmacsystemfont',
  'sans-serif', 'serif', 'monospace', 'cursive', 'fantasy',
])

export function TypeSpecimenCard({ typography, index }: { typography: TypographyRow; index: number }) {
  const hasWebfont = Boolean(typography.google_fonts_url)
  /**
   * Only ever used to caption the specimen, never to hide it. Fading the type
   * out until its webfont arrived meant up to four seconds of a near-invisible
   * block, which reads as a broken panel — worse than the brief glimpse of a
   * fallback that it was avoiding. The face swaps in when it loads, the way
   * every other page on the web does it.
   */
  const [state, setState] = useState<'loading' | 'checking' | 'loaded' | 'unavailable'>(
    hasWebfont ? 'loading' : 'checking',
  )
  const copied = useCopied()
  const { playCopy } = useSoundsContext()

  const weight = typography.primary_weight ?? (typography.role === 'heading' ? 700 : 400)
  const isMono = typography.role === 'mono'
  const fontFamily = `"${typography.font_family}", ${FALLBACK[typography.role] ?? 'sans-serif'}`

  useEffect(() => {
    const url = typography.google_fonts_url

    // No webfont to fetch is not the same as no face to show. Inter, and any
    // family the app or the operating system already carries, renders exactly
    // as named — the first cut of this assumed otherwise and captioned every
    // such specimen "shown in a fallback" underneath type that was correct.
    if (!url) {
      document.fonts.ready.then(() => {
        setState(
          GENERIC.has(typography.font_family.toLowerCase()) ||
          document.fonts.check(`${weight} 16px "${typography.font_family}"`)
            ? 'loaded' : 'unavailable',
        )
      })
      return
    }

    let done = false
    /**
     * A stylesheet that loads is not a face that renders — the sheet can 404,
     * or name a family the site does not actually serve. document.fonts.check
     * asks the only question worth asking. The specimen used to sit at 6%
     * opacity forever when this went wrong, which read as a rendering bug
     * rather than a missing font.
     */
    function settle() {
      if (done) return
      done = true
      const available = document.fonts.check(`${weight} 16px "${typography.font_family}"`)
      setState(available ? 'loaded' : 'unavailable')
    }

    const existing = document.querySelector(`link[href="${url.replace(/"/g, '\\"')}"]`)
    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = url
      link.onload = () => document.fonts.ready.then(settle)
      link.onerror = () => { done = true; setState('unavailable') }
      document.head.appendChild(link)
    } else {
      document.fonts.ready.then(settle)
    }

    const timer = setTimeout(settle, FONT_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [typography.google_fonts_url, typography.font_family, weight])

  const isGoogleFont = hasWebfont
  const source = isGoogleFont
    ? { name: 'Google Fonts', url: typography.google_fonts_url!, type: 'free' as const }
    : getFontSource(typography.font_family)

  const displaySize = isMono ? 30 : typography.role === 'heading' ? 46 : 38

  async function copyCss() {
    const css = [
      `font-family: "${typography.font_family}", ${FALLBACK[typography.role] ?? 'sans-serif'};`,
      `font-weight: ${weight};`,
    ].join('\n')
    try {
      await navigator.clipboard.writeText(css)
      playCopy()
      copied.markCopied(typography.role)
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div
      className="px-5 pt-5 pb-5 border-b border-edge-faint last:border-0"
      style={{ opacity: 0, animation: `fade-in-up 0.45s var(--ease-sig) ${index * 70}ms both` }}
    >
      {/* The role is what you are scanning for when a site has three faces, so
          it leads rather than sitting in a footer under the specimen. */}
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <span className="text-micro text-ink-4 tracking-[0.06em] uppercase">
          {ROLE_LABEL[typography.role] ?? typography.role}
        </span>
        <button
          onClick={copyCss}
          className="text-micro text-ink-4 hover:text-ink-2 transition-colors flex items-center gap-1"
        >
          {copied.copiedId === typography.role
            ? <><Check className="w-3 h-3" weight="bold" /> copied</>
            : 'copy CSS'}
        </button>
      </div>

      {/* The face set in itself, which is the whole point of a specimen. */}
      <div
        className="leading-[1.05] mb-3 break-words transition-opacity duration-300"
        style={{
          fontFamily,
          fontSize: displaySize,
          fontWeight: weight,
          letterSpacing: '-0.025em',
          color: 'var(--foreground)',
        }}
      >
        {typography.font_family}
      </div>

      <div
        className="leading-snug mb-2.5 transition-opacity duration-300"
        style={{
          fontFamily,
          fontSize: isMono ? 13 : 16,
          fontWeight: Math.min(weight, 450),
          letterSpacing: isMono ? '0.01em' : '-0.01em',
          color: 'oklch(from var(--foreground) l c h / 0.55)',
        }}
      >
        {isMono ? MONO_LINE : PANGRAM}
      </div>

      <div
        className="mb-4 transition-opacity duration-300"
        style={{
          fontFamily,
          fontSize: 12,
          fontWeight: 400,
          letterSpacing: '0.02em',
          color: 'oklch(from var(--foreground) l c h / 0.28)',
        }}
      >
        {isMono ? MONO_CHARSET : CHARSET}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Measured sample from the extraction row — what the role actually
              renders at — not the specimen's display size above it. */}
          <span className="text-meta text-ink-4 tabular-nums">
            {weight}
            {typography.sample_size_px != null && ` · ${Math.round(typography.sample_size_px)}px`}
            {typography.sample_line_height && ` / ${typography.sample_line_height}`}
          </span>
          {/* Rendering a fallback while naming the real face is a quiet lie,
              and the reader has no way to tell from the shapes alone. */}
          {state === 'unavailable' && (
            <span className="text-micro text-ink-4">shown in a fallback</span>
          )}
        </div>

        {source && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group/src"
          >
            <span className={[
              'text-micro px-1.5 py-[3px] rounded-[4px]',
              source.type === 'free'
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]/60'
                : 'bg-muted/60 text-ink-4',
            ].join(' ')}>
              {source.type === 'free' ? 'free' : 'paid'}
            </span>
            <span className="text-meta text-ink-4 group-hover/src:text-ink-2 transition-colors truncate">
              {source.name}
            </span>
            <ArrowSquareOut className="w-2.5 h-2.5 shrink-0 text-ink-4 group-hover/src:text-ink-3 transition-colors" weight="regular" />
          </a>
        )}
      </div>
    </div>
  )
}
