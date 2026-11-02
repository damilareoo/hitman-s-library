'use client'

import { useEffect, useState } from 'react'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
  sample_size_px?: number | null
  sample_line_height?: string | null
}

const FALLBACK: Record<string, string> = {
  heading: 'sans-serif',
  body: 'sans-serif',
  mono: 'monospace',
}

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

/**
 * The provider is read off the stylesheet URL the extraction captured, never
 * guessed from the family name. A family whose stylesheet is not a known
 * provider gets no attribution at all — a guessed source is worse than none.
 */
function providerOf(url: string): string | null {
  if (url.includes('fonts.googleapis.com')) return 'Google Fonts'
  if (url.includes('fonts.bunny.net')) return 'Bunny Fonts'
  if (url.includes('use.typekit') || url.includes('fonts.net')) return 'Adobe Fonts'
  if (url.includes('fontshare.com')) return 'Fontshare'
  return null
}

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

  const weight = typography.primary_weight ?? (typography.role === 'heading' ? 700 : 400)
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
     * asks the only question worth asking.
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

  const provider = typography.google_fonts_url ? providerOf(typography.google_fonts_url) : null

  return (
    <div
      className={index > 0 ? 'mt-9' : undefined}
      style={{ opacity: 0, animation: `fade-in-up 0.45s var(--ease-sig) ${index * 70}ms both` }}
    >
      {/* The name set in itself is the whole specimen. The attribution sits
          inline on the name line, in the UI voice, and only when the stylesheet
          URL proves a provider — the directory pattern, minus the guessing. */}
      <p
        className="m-0 break-words"
        style={{
          fontFamily,
          fontSize: 32,
          lineHeight: 1.15,
          fontWeight: weight,
          letterSpacing: '-0.015em',
          color: 'var(--foreground)',
        }}
      >
        {typography.font_family}
        {provider && (
          <span className="font-sans text-[14px] tracking-[0.01em] text-ink-4">
            {' '}by{' '}
            <a
              href={typography.google_fonts_url!}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-3 hover:text-ink no-underline hover:underline transition-colors"
            >
              {provider}
            </a>
          </span>
        )}
      </p>

      {/* Rendering a fallback while naming the real face is a quiet lie,
          and the reader has no way to tell from the shapes alone. */}
      {state === 'unavailable' && (
        <p className="m-0 mt-1.5 font-sans text-[12px] text-ink-4">shown in a fallback</p>
      )}
    </div>
  )
}
