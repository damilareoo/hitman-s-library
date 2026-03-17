// components/type-tab.tsx
'use client'

import { TypeSpecimenCard } from './type-specimen-card'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

export function TypeTab({ typography }: { typography: TypographyRow[] }) {
  if (!typography.length) {
    return (
      <div className="flex items-center justify-center flex-1 p-8">
        <p className="text-xs text-muted-foreground">No typography extracted</p>
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
