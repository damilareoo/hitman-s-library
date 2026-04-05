// components/preview-tab.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  siteUrl: string
  extractionError?: string | null
}

type Viewport = 'desktop' | 'mobile'

export function PreviewTab({ siteUrl, extractionError }: PreviewTabProps) {
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [blocked, setBlocked] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [mobileScale, setMobileScale] = useState(1)
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset on URL change
  useEffect(() => {
    setViewport('desktop')
    setBlocked(false)
    setLoaded(false)
  }, [siteUrl])

  // Mobile scale: fit 390px into container width
  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width
      if (w > 0) setMobileScale(w / 390)
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  // Blocked detection timer — fires if iframe doesn't communicate load within 7s
  useEffect(() => {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    setBlocked(false)
    setLoaded(false)
    blockTimerRef.current = setTimeout(() => {
      setBlocked(true)
    }, 7000)
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current) }
  }, [siteUrl, viewport])

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

  const MOBILE_W = 390
  const MOBILE_H = 844

  return (
    <div className="relative flex-1 overflow-hidden min-h-0 flex flex-col">
      {/* Viewport toolbar */}
      <div className="flex border-b border-border/40 shrink-0 bg-background">
        <button
          onClick={() => setViewport('desktop')}
          className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${viewport === 'desktop' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Desktop
        </button>
        <button
          onClick={() => setViewport('mobile')}
          className={`flex-1 py-1.5 text-[10px] font-mono border-l border-border/40 transition-colors ${viewport === 'mobile' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Mobile
        </button>
      </div>

      {/* Loading shimmer */}
      {!loaded && (
        <div className="absolute inset-0 top-[29px] bg-muted/30 z-10 pointer-events-none">
          <div className="absolute inset-0 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        </div>
      )}

      {/* Desktop iframe */}
      {viewport === 'desktop' && (
        <div ref={containerRef} className="flex-1 overflow-hidden relative">
          <iframe
            key={`desktop-${siteUrl}`}
            src={siteUrl}
            title={`Live preview of ${siteUrl}`}
            onLoad={handleLoad}
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}

      {/* Mobile iframe — scaled to panel width */}
      {viewport === 'mobile' && (
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative bg-muted/10"
          style={{ minHeight: 0 }}
        >
          <div
            className="absolute top-0 left-0"
            style={{
              width: MOBILE_W,
              height: MOBILE_H,
              transform: `scale(${mobileScale})`,
              transformOrigin: 'top left',
            }}
          >
            <iframe
              key={`mobile-${siteUrl}`}
              src={siteUrl}
              title={`Mobile preview of ${siteUrl}`}
              onLoad={handleLoad}
              className="w-full h-full border-none"
              style={{ width: MOBILE_W, height: MOBILE_H }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>
        </div>
      )}

      {/* Blocked nudge */}
      <AnimatePresence>
        {blocked && loaded === false && (
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
