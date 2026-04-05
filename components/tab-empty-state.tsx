// components/tab-empty-state.tsx
// Shared empty/error state used by Colors, Type, and Assets tabs.
'use client'

import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface Props {
  message: string
  extractionError?: string | null
}

export function TabEmptyState({ message, extractionError }: Props) {
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
        <Icon className="w-3.5 h-3.5" aria-hidden />
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
