// components/type-tab.tsx
'use client'

import { TypeSpecimenCard } from './type-specimen-card'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

export function TypeTab({ typography, extractionError }: { typography: TypographyRow[]; extractionError?: string | null }) {
  if (!typography.length) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-8 text-center">
        <p className="text-xs text-muted-foreground">No typography extracted</p>
        {extractionError && (
          <p className="font-mono text-[10px] text-destructive/70 max-w-[220px] break-words">{extractionError}</p>
        )}
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {typography.slice(0, 3).map((t, i) => (
        <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
      ))}
    </div>
  )
}
