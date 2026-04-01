// components/type-tab.tsx
'use client'

import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { TypeSpecimenCard } from './type-specimen-card'

interface TypographyRow {
  font_family: string
  role: string
  google_fonts_url: string | null
  primary_weight: number | null
}

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

function FailureEmptyState({ message, extractionError }: { message: string; extractionError?: string | null }) {
  if (!extractionError) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 p-8 text-center">
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    )
  }
  const info = classifyExtractionError(extractionError)
  const Icon = ICONS[info.icon]
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
      <div className="flex items-center gap-2 text-muted-foreground/60">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-widest font-mono">{info.label}</span>
      </div>
      <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">{info.explanation}</p>
      <details className="text-left w-full max-w-[240px]">
        <summary className="text-[10px] font-mono text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/60">
          Show technical details
        </summary>
        <p className="font-mono text-[9px] text-muted-foreground/40 mt-1 break-all">{extractionError}</p>
      </details>
    </div>
  )
}

export function TypeTab({ typography, extractionError }: { typography: TypographyRow[]; extractionError?: string | null }) {
  if (!typography.length) {
    return <FailureEmptyState message="No typography extracted" extractionError={extractionError} />
  }
  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto">
      {typography.slice(0, 3).map((t, i) => (
        <TypeSpecimenCard key={`${t.role}-${i}`} typography={t} index={i} />
      ))}
    </div>
  )
}
