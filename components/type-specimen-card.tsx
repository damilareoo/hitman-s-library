'use client'

import { useEffect, useState } from 'react'
import { ArrowSquareOut } from '@phosphor-icons/react'
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

export function TypeSpecimenCard({ typography, index }: { typography: TypographyRow; index: number }) {
  const [fontLoaded, setFontLoaded] = useState(!typography.google_fonts_url)

  useEffect(() => {
    if (!typography.google_fonts_url) { setFontLoaded(true); return }
    const existing = document.querySelector(`link[href="${typography.google_fonts_url.replace(/"/g, '\\"')}"]`)
    if (existing) { setFontLoaded(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = typography.google_fonts_url
    link.onload = () => setFontLoaded(true)
    document.head.appendChild(link)
  }, [typography.google_fonts_url])

  const weight = typography.primary_weight ?? (typography.role === 'heading' ? 700 : 400)
  const fontFamily = `"${typography.font_family}", ${FALLBACK[typography.role] ?? 'sans-serif'}`
  const isMono = typography.role === 'mono'

  const isGoogleFont = Boolean(typography.google_fonts_url)
  const source = isGoogleFont
    ? { name: 'Google Fonts', url: typography.google_fonts_url!, type: 'free' as const }
    : getFontSource(typography.font_family)

  // Cascade sizes: display → body → caption
  const sizes = isMono
    ? [{ size: 28, weight: 400, text: typography.font_family },
       { size: 13, weight: 400, text: 'const design = () => "visual language"' },
       { size: 10, weight: 400, text: '0 1 2 3 { } [ ] ( )  →  ←  ≤  ≥' }]
    : typography.role === 'heading'
      ? [{ size: 52, weight, text: typography.font_family },
         { size: 16, weight: Math.min(weight, 450), text: 'Designers make decisions that shape how people experience the world.' },
         { size: 11, weight: 400, text: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii  0 1 2 3 4 5 6 7 8 9' }]
      : [{ size: 38, weight, text: typography.font_family },
         { size: 14, weight: Math.min(weight, 450), text: 'Designers make decisions that shape how people experience the world.' },
         { size: 11, weight: 400, text: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii  0 1 2 3 4 5 6 7 8 9' }]

  return (
    <div
      className="px-5 pt-7 pb-6 border-b border-edge-faint last:border-0"
      style={{ opacity: 0, animation: `fade-in-up 0.45s var(--ease-sig) ${index * 70}ms both` }}
    >
      {/* Cascade specimen */}
      <div className="space-y-2.5 mb-5">
        {sizes.map(({ size, weight: w, text }, i) => (
          <div
            key={i}
            className="transition-opacity duration-500 leading-tight overflow-hidden"
            style={{
              fontFamily,
              fontSize: size,
              fontWeight: w,
              letterSpacing: size > 30 ? '-0.025em' : isMono ? '0.01em' : '-0.01em',
              color: i === 0
                ? 'var(--foreground)'
                : i === 1
                  ? 'oklch(from var(--foreground) l c h / 0.45)'
                  : 'oklch(from var(--foreground) l c h / 0.2)',
              opacity: fontLoaded ? 1 : (i === 0 ? 0.06 : 0.03),
            }}
          >
            {text}
          </div>
        ))}
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-micro text-ink-4">
            {ROLE_LABEL[typography.role] ?? typography.role}
          </span>
          <span className="text-meta text-ink-4 tabular-nums">{weight}</span>
        </div>

        <div className="flex items-center gap-1.5">
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
    </div>
  )
}
