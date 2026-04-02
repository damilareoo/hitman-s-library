// components/preview-tab.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  screenshotUrl: string | null
  siteUrl: string
  extractionError?: string | null
  mobileScreenshotUrl?: string | null
}

export function PreviewTab({ screenshotUrl, siteUrl, extractionError, mobileScreenshotUrl }: PreviewTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)
  const [showBackTop, setShowBackTop] = useState(false)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    setShowHint(true)
    setShowBackTop(false)
    setViewport('desktop')
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [screenshotUrl])

  function handleScroll() {
    const top = scrollRef.current?.scrollTop ?? 0
    if (top > 50) setShowHint(false)
    setShowBackTop(top > 200)
  }

  if (!screenshotUrl) {
    if (extractionError) {
      const info = classifyExtractionError(extractionError)
      const Icon = ICONS[info.icon]
      return (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
          <div className="w-full rounded-md border border-border p-6 text-center space-y-3">
            <p className="font-mono text-sm text-muted-foreground">
              {(() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()}
            </p>
            <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-widest font-mono">{info.label}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{info.explanation}</p>
            <details className="text-left">
              <summary className="text-[10px] font-mono text-muted-foreground/40 cursor-pointer hover:text-muted-foreground/60">
                Show technical details
              </summary>
              <p className="font-mono text-[9px] text-muted-foreground/40 mt-1 break-all">{extractionError}</p>
            </details>
          </div>
        </div>
      )
    }
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="w-full rounded-md border border-border p-6 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {(() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">Screenshot unavailable</p>
        </div>
      </div>
    )
  }

  const hasMobile = Boolean(mobileScreenshotUrl)
  const activeUrl = hasMobile && viewport === 'mobile' ? mobileScreenshotUrl! : screenshotUrl

  return (
    <div className="relative flex-1 overflow-hidden min-h-0 flex flex-col">
      {hasMobile && (
        <div className="flex border-b border-border/40 shrink-0">
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
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeUrl!}
          alt={`Screenshot of ${siteUrl}`}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>

      {/* Scroll hint */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center pb-2 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)',
          opacity: showHint ? 1 : 0,
        }}
      >
        <span className="font-mono text-[10px] text-muted-foreground/40">scroll to explore ↓</span>
      </div>

      {/* Back to top */}
      <AnimatePresence>
        {showBackTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="absolute bottom-3 right-3 font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground border border-border/40 hover:border-border rounded px-2 py-1 bg-background/80 backdrop-blur-sm transition-colors"
          >
            ↑
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
