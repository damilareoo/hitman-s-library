// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  mobileScreenshotUrl?: string | null
  extractionError?: string | null
}

export function PreviewTab({ siteUrl, screenshotUrl, mobileScreenshotUrl, extractionError }: PreviewTabProps) {
  const [mode, setMode] = useState<'live' | 'screenshot'>('live')
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [loaded, setLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const hasScreenshot = Boolean(screenshotUrl)
  const hasMobile = Boolean(mobileScreenshotUrl)
  const activeScreenshot = hasMobile && viewport === 'mobile' ? mobileScreenshotUrl! : (screenshotUrl ?? null)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`

  useEffect(() => {
    setMode('live')
    setViewport('desktop')
    setLoaded(false)
    setProxyFailed(false)
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    loadTimerRef.current = setTimeout(() => setProxyFailed(true), 12000)
    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current) }
  }, [siteUrl])

  // Auto-fall to screenshot mode if proxy fails and we have one
  useEffect(() => {
    if (proxyFailed && hasScreenshot) setMode('screenshot')
  }, [proxyFailed, hasScreenshot])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'proxy-failed') {
        if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
        setProxyFailed(true)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function handleLoad() {
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    setLoaded(true)
  }

  if (extractionError && !screenshotUrl && !siteUrl) {
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

  const showModeToggle = hasScreenshot && !proxyFailed
  const showViewportToggle = hasMobile && mode === 'screenshot'

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Mode toggle — Live vs Screenshot (only when both are available) */}
      {showModeToggle && (
        <div className="flex border-b border-border/40 shrink-0">
          <button
            onClick={() => setMode('live')}
            className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${mode === 'live' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Live
          </button>
          <button
            onClick={() => setMode('screenshot')}
            className={`flex-1 py-1.5 text-[10px] font-mono border-l border-border/40 transition-colors ${mode === 'screenshot' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Screenshot
          </button>
        </div>
      )}

      {/* Desktop / Mobile sub-toggle (screenshot mode, mobile available) */}
      {showViewportToggle && (
        <div className="flex border-b border-border/40 shrink-0">
          <button
            onClick={() => setViewport('desktop')}
            className={`flex-1 py-1 text-[9px] font-mono transition-colors ${viewport === 'desktop' ? 'text-foreground bg-muted/60' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Desktop
          </button>
          <button
            onClick={() => setViewport('mobile')}
            className={`flex-1 py-1 text-[9px] font-mono border-l border-border/40 transition-colors ${viewport === 'mobile' ? 'text-foreground bg-muted/60' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Mobile
          </button>
        </div>
      )}

      {/* Screenshot view */}
      {mode === 'screenshot' ? (
        activeScreenshot ? (
          <>
            <div className="flex-1 overflow-auto">
              <img
                src={activeScreenshot}
                alt="Site screenshot"
                className="w-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-mono text-muted-foreground/60">
                {proxyFailed ? 'Live preview unavailable — showing screenshot' : 'Showing captured screenshot'}
              </p>
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-mono text-foreground/60 hover:text-foreground underline underline-offset-2 shrink-0 transition-colors"
              >
                Open site ↗
              </a>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
            <p className="text-xs text-muted-foreground max-w-[200px] leading-relaxed">
              {proxyFailed ? 'This site blocked the preview.' : 'No screenshot captured yet.'}
            </p>
            <a
              href={siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-mono text-foreground underline underline-offset-2"
            >
              Open in tab ↗
            </a>
          </div>
        )
      ) : (
        /* Live iframe view */
        <div className="relative flex-1 overflow-hidden min-h-0">
          {!loaded && (
            <div className="absolute inset-0 bg-muted/30 z-10 pointer-events-none flex items-center justify-center">
              <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
            </div>
          )}
          <iframe
            key={proxyUrl}
            src={proxyUrl}
            title={`Live preview of ${siteUrl}`}
            onLoad={handleLoad}
            onError={() => setProxyFailed(true)}
            className="w-full h-full border-none"
          />
        </div>
      )}
    </div>
  )
}
