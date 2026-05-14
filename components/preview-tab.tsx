// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { getDomain } from '@/lib/get-domain'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }

interface PreviewTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  mobileScreenshotUrl?: string | null
  extractionError?: string | null
}

export function PreviewTab({ siteUrl, extractionError }: PreviewTabProps) {
  const [loaded, setLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const domain = getDomain(siteUrl)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`

  useEffect(() => {
    setLoaded(false)
    setProxyFailed(false)
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    loadTimerRef.current = setTimeout(() => setProxyFailed(true), 8000)
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

  if (proxyFailed) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        <div className="text-center space-y-1.5">
          <p className="text-[14px] font-mono text-foreground/45 tracking-tight">{domain}</p>
          <p className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/30">
            Live preview unavailable
          </p>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-mono text-muted-foreground/40 hover:text-foreground border border-border/40 hover:border-foreground/25 rounded-[3px] px-3 py-1.5 transition-colors"
        >
          Open site ↗
        </a>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden min-h-0">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <span className="text-[12px] font-mono text-muted-foreground/30 tracking-tight">{domain}</span>
          <div className="flex gap-1.5">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="w-1 h-1 rounded-full bg-muted-foreground/25 animate-pulse"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}
      <iframe
        key={proxyUrl}
        src={proxyUrl}
        title={`Live preview of ${siteUrl}`}
        onLoad={handleLoad}
        onError={() => setProxyFailed(true)}
        sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
        className="w-full h-full border-none"
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
      />
    </div>
  )
}
