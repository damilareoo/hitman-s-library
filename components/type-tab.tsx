// components/type-tab.tsx
'use client'

import { TypeSpecimenCard } from './type-specimen-card'
import { TabEmptyState } from './tab-empty-state'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

export function TypeTab({ typography, extractionError }: { typography: TypographyRow[]; extractionError?: string | null }) {
  if (!typography.length) {
    return <TabEmptyState message="No typography extracted" extractionError={extractionError} />
  }
  return (
    <div className="p-4 overflow-y-auto flex flex-col gap-0">
      {typography.map((t, i) => (
        <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
      ))}
    </div>
  )
}
