// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  siteUrl: string
  extractionError?: string | null
}

export function PreviewTab({ siteUrl, extractionError }: PreviewTabProps) {
  const [blocked, setBlocked] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on URL change
  useEffect(() => {
    setBlocked(false)
    setLoaded(false)
  }, [siteUrl])

  // Blocked detection timer — fires if iframe doesn't load within 7s
  useEffect(() => {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    setBlocked(false)
    setLoaded(false)
    const t = setTimeout(() => setBlocked(true), 7000)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteUrl])

  function handleLoad() {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    setLoaded(true)
  }

  if (extractionError && !siteUrl) {
    const info = classifyExtractionError(extractionError)
    const Icon = ICONS[info.icon]
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="w-full rounded-md border border-border p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase tracking-widest font-mono">{info.label}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{info.explanation}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden min-h-0 flex flex-col">
      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted/30 z-10 pointer-events-none">
          <div className="absolute inset-0 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden relative">
        <iframe
          key={siteUrl}
          src={siteUrl}
          title={`Live preview of ${siteUrl}`}
          onLoad={handleLoad}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Blocked nudge */}
      <AnimatePresence>
        {blocked && !loaded && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-3 left-3 right-3 z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-2"
          >
            <p className="text-[11px] font-mono text-muted-foreground">
              Site may block embedding
            </p>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-foreground underline underline-offset-2 shrink-0"
            >
              Open in tab ↗
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
