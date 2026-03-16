// components/type-specimen-card.tsx
'use client'

import { useEffect, useState } from 'react'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

const ROLE_LABELS: Record<string, string> = {
  heading: 'Heading',
  body: 'Body',
  mono: 'Monospace',
}

const FALLBACKS: Record<string, string> = {
  heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  body: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "Geist Mono", monospace',
}

export function TypeSpecimenCard({ typography, index }: { typography: TypographyRow; index: number }) {
  const [fontLoaded, setFontLoaded] = useState(!typography.google_fonts_url)

  useEffect(() => {
    if (!typography.google_fonts_url) return
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = typography.google_fonts_url
    link.onload = () => setFontLoaded(true)
    document.head.appendChild(link)
    return () => { try { document.head.removeChild(link) } catch {} }
  }, [typography.google_fonts_url])

  const weight = typography.primary_weight ?? 400
  const fontFamily = `"${typography.font_family}", ${FALLBACKS[typography.role] ?? 'sans-serif'}`

  return (
    <div
      className="border border-border rounded-md p-4 flex flex-col gap-3"
      style={{ animationDelay: `${index * 60}ms`, animation: 'fade-in-up 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground/60">
          {ROLE_LABELS[typography.role] ?? typography.role} — {typography.font_family}
        </span>
        {typography.google_fonts_url && (
          <span className="text-[8px] text-muted-foreground/40 border border-border rounded px-1.5 py-0.5">
            Google Fonts
          </span>
        )}
      </div>

      <div style={{ fontFamily, fontSize: 48, fontWeight: weight, lineHeight: 1, opacity: fontLoaded ? 1 : 0.3, transition: 'opacity 0.3s' }}>
        Aa
      </div>

      <p style={{ fontFamily, fontSize: 16, fontWeight: weight, color: 'var(--muted-foreground)', margin: 0 }}>
        The quick brown fox jumps
      </p>

      <p style={{ fontFamily, fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)', opacity: 0.5, margin: 0, letterSpacing: '0.05em' }}>
        A B C D E F G H I J K L M
      </p>

      <div className="flex gap-1.5">
        <span className="font-mono text-[9px] px-2 py-0.5 rounded border border-foreground text-foreground">
          {weight}
        </span>
      </div>
    </div>
  )
}
