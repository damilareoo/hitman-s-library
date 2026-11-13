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
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
      {/* Same strip as the Colors tab: what this is on the left, how to read it on the right. */}
      <div className="sticky top-0 z-10 bg-background px-4 pt-3 pb-1 h-10 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[12px] font-[500] text-ink-3">Fonts in use <span className="text-ink-4 tabular-nums">{typography.length}</span></span>
        <span className="text-[12px] text-ink-4">Set in the face the live site used</span>
      </div>
      <div className="px-4 pt-3 pb-6 flex flex-col">
        {typography.map((t, i) => (
          <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
        ))}
      </div>
    </div>
  )
}
