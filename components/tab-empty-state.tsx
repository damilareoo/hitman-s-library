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
        <p className="text-meta text-ink-3">{message}</p>
      </div>
    )
  }
  const info = classifyExtractionError(extractionError)
  const Icon = ICONS[info.icon]
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
      <div className="flex items-center gap-2 text-ink-3">
        <Icon className="w-3.5 h-3.5" aria-hidden />
        <span className="text-micro">{info.label}</span>
      </div>
      <p className="text-bodytext text-ink-2 max-w-[220px] leading-relaxed">{info.explanation}</p>
      <details className="text-left w-full max-w-[240px]">
        <summary className="text-micro text-ink-4 cursor-pointer hover:text-ink-3 transition-colors">
          Show technical details
        </summary>
        <p className="text-meta text-ink-4 mt-1 break-all">{extractionError}</p>
      </details>
    </div>
  )
}
