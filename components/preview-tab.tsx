// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  extractionError?: string | null
}

export function PreviewTab({ siteUrl, screenshotUrl, extractionError }: PreviewTabProps) {
  const [loaded, setLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Proxy URL — strips X-Frame-Options / CSP frame-ancestors server-side
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`

  useEffect(() => {
    setLoaded(false)
    setProxyFailed(false)
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    // If proxy hasn't loaded after 12s, treat as failed
    loadTimerRef.current = setTimeout(() => setProxyFailed(true), 12000)
    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current) }
  }, [siteUrl])

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

  // Proxy failed — show screenshot or open-in-tab fallback
  if (proxyFailed) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        {screenshotUrl ? (
          <>
            <div className="flex-1 overflow-auto">
              <img
                src={screenshotUrl}
                alt="Site screenshot"
                className="w-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="shrink-0 border-t border-border bg-background/95 px-3 py-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-mono text-muted-foreground/60">
                Live preview unavailable — showing screenshot
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
              This site blocked the preview.
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
        )}
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
          key={proxyUrl}
          src={proxyUrl}
          title={`Live preview of ${siteUrl}`}
          onLoad={handleLoad}
          onError={() => setProxyFailed(true)}
          className="w-full h-full border-none"
        />
      </div>
    </div>
  )
}
