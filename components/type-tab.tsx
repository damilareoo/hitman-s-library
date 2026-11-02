// components/type-tab.tsx
'use client'

import { TypeSpecimenCard } from './type-specimen-card'
import { TabEmptyState } from './tab-empty-state'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
  sample_size_px?: number | null
  sample_line_height?: string | null
}

export function TypeTab({ typography, extractionError }: { typography: TypographyRow[]; extractionError?: string | null }) {
  if (!typography.length) {
    return <TabEmptyState message="No typography extracted" extractionError={extractionError} />
  }
  return (
    <div className="p-6 overflow-y-auto flex flex-col" data-lenis-prevent>
      <p className="m-0 mb-6 font-sans text-[12px] text-ink-4">Fonts in use</p>
      {typography.map((t, i) => (
        <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
      ))}
      <p className="m-0 mt-8 pt-3.5 border-t border-edge-faint font-sans text-[12px] leading-relaxed text-ink-4">
        Each name is set in the face that rendered on the live site.
      </p>
    </div>
  )
}
