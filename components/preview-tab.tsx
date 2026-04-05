// components/preview-tab.tsx
'use client'

import { useRef, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning, ArrowSquareOut } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  screenshotUrl: string | null
  siteUrl: string
  extractionError?: string | null
  mobileScreenshotUrl?: string | null
}

type Viewport = 'desktop' | 'mobile'
type PreviewMode = 'screenshot' | 'live'

export function PreviewTab({ screenshotUrl, siteUrl, extractionError, mobileScreenshotUrl }: PreviewTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)
  const [showBackTop, setShowBackTop] = useState(false)
  const [viewport, setViewport] = useState<Viewport>('desktop')
  const [mode, setMode] = useState<PreviewMode>('screenshot')
  const [iframeBlocked, setIframeBlocked] = useState(false)
  const iframeBlockedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setShowHint(true)
    setShowBackTop(false)
    setViewport('desktop')
    setMode('screenshot')
    setIframeBlocked(false)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [screenshotUrl])

  // When switching to live mode, start a timer — if iframe doesn't show content
  // within 5s (blocked by X-Frame-Options), show a warning
  useEffect(() => {
    if (iframeBlockedTimer.current) clearTimeout(iframeBlockedTimer.current)
    if (mode === 'live') {
      setIframeBlocked(false)
      iframeBlockedTimer.current = setTimeout(() => setIframeBlocked(true), 6000)
    }
    return () => { if (iframeBlockedTimer.current) clearTimeout(iframeBlockedTimer.current) }
  }, [mode, siteUrl])

  function handleScroll() {
    const top = scrollRef.current?.scrollTop ?? 0
    if (top > 50) setShowHint(false)
    setShowBackTop(top > 200)
  }

  function handleIframeLoad() {
    if (iframeBlockedTimer.current) clearTimeout(iframeBlockedTimer.current)
    // Can't read cross-origin iframe content, so we can't detect blocking here.
    // The timer fallback handles this.
  }

  if (!screenshotUrl && mode === 'screenshot') {
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
          {/* Offer live view as alternative */}
          <button
            onClick={() => setMode('live')}
            className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground border border-border/40 hover:border-border rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5"
          >
            <ArrowSquareOut className="w-3 h-3" weight="regular" />
            Try live preview instead
          </button>
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
        <button
          onClick={() => setMode('live')}
          className="text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground border border-border/40 hover:border-border rounded-md px-3 py-1.5 transition-colors flex items-center gap-1.5"
        >
          <ArrowSquareOut className="w-3 h-3" weight="regular" />
          Try live preview instead
        </button>
      </div>
    )
  }

  const hasMobile = Boolean(mobileScreenshotUrl)
  const activeScreenshotUrl = hasMobile && viewport === 'mobile' ? mobileScreenshotUrl! : screenshotUrl!

  return (
    <div className="relative flex-1 overflow-hidden min-h-0 flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center border-b border-border/40 shrink-0 bg-background">
        {/* Viewport selector (screenshot mode only) */}
        {mode === 'screenshot' && hasMobile && (
          <div className="flex flex-1">
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
        {mode === 'screenshot' && !hasMobile && <div className="flex-1" />}
        {mode === 'live' && <div className="flex-1 px-2.5 py-1.5">
          <span className="text-[10px] font-mono text-muted-foreground/40 truncate block">{siteUrl}</span>
        </div>}

        {/* Mode toggle */}
        <div className="flex border-l border-border/40 shrink-0">
          <button
            onClick={() => setMode('screenshot')}
            className={`px-3 py-1.5 text-[10px] font-mono transition-colors ${mode === 'screenshot' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Shot
          </button>
          <button
            onClick={() => setMode('live')}
            className={`px-3 py-1.5 text-[10px] font-mono border-l border-border/40 transition-colors flex items-center gap-1 ${mode === 'live' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Live
          </button>
        </div>
      </div>

      {/* Screenshot mode */}
      {mode === 'screenshot' && (
        <>
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ scrollbarWidth: 'thin' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeScreenshotUrl}
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
            <span className="font-mono text-[10px] text-muted-foreground/40">scroll ↓</span>
          </div>

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
        </>
      )}

      {/* Live iframe mode */}
      {mode === 'live' && (
        <div className="flex-1 relative overflow-hidden flex flex-col bg-muted/20">
          <iframe
            key={siteUrl}
            src={siteUrl}
            title={`Live preview of ${siteUrl}`}
            onLoad={handleIframeLoad}
            className="flex-1 w-full border-none"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
          {/* Blocked warning — shown after 6s timeout */}
          <AnimatePresence>
            {iframeBlocked && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-3 left-3 right-3 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-2"
              >
                <p className="text-[11px] font-mono text-muted-foreground">
                  Site may block embedding
                </p>
                <button
                  onClick={() => setMode('screenshot')}
                  className="text-[11px] font-mono text-foreground underline underline-offset-2 shrink-0"
                >
                  Use screenshot
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
