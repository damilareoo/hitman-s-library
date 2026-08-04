// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { getDomain } from '@/lib/get-domain'
import { Spinner } from './ui/spinner'

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
        <div className="w-full rounded-[4px] border border-edge p-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-ink-3">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-micro">{info.label}</span>
          </div>
          <p className="text-bodytext text-ink-2 leading-relaxed">{info.explanation}</p>
        </div>
      </div>
    )
  }

  if (proxyFailed) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-5">
        <div className="text-center space-y-1.5">
          <p className="text-meta text-ink-2">{domain}</p>
          <p className="text-micro text-ink-4">
            Live preview unavailable
          </p>
        </div>
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ui text-ink-3 hover:text-ink border border-edge hover:border-foreground/25 rounded-[4px] px-3 py-1.5 transition-colors"
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
          <span className="text-meta text-ink-3">{domain}</span>
          <Spinner />
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
        style={{ opacity: loaded ? 1 : 0, transition: 'opacity var(--dur-4) var(--ease-sig)' }}
      />
    </div>
  )
}
