// components/preview-tab.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldWarning, LockSimple, Clock, FileDashed, Warning, DeviceMobile, Globe, ArrowUpRight } from '@phosphor-icons/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { getDomain } from '@/lib/get-domain'
import { Spinner } from './ui/spinner'

const ICONS = { ShieldWarning, LockSimple, Clock, FileDashed, Warning }
type PreviewMode = 'live' | 'screenshot' | 'mobile'

interface PreviewTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  mobileScreenshotUrl?: string | null
  extractionError?: string | null
}

export function PreviewTab({ siteUrl, screenshotUrl, mobileScreenshotUrl, extractionError }: PreviewTabProps) {
  const [loaded, setLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const [mode, setMode] = useState<PreviewMode>('live')
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const domain = getDomain(siteUrl)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`
  const hasDesktopScreenshot = Boolean(screenshotUrl)
  const hasMobileScreenshot = Boolean(mobileScreenshotUrl)
  const hasScreenshot = hasDesktopScreenshot || hasMobileScreenshot
  const activeScreenshotUrl =
    mode === 'mobile' ? mobileScreenshotUrl :
    mode === 'screenshot' ? screenshotUrl :
    null

  useEffect(() => {
    setLoaded(false)
    setProxyFailed(false)
    setMode('live')
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current)
    loadTimerRef.current = setTimeout(() => setProxyFailed(true), 8000)
    return () => { if (loadTimerRef.current) clearTimeout(loadTimerRef.current) }
  }, [siteUrl])

  useEffect(() => {
    if (!proxyFailed || !hasScreenshot || mode !== 'live') return
    setMode(hasDesktopScreenshot ? 'screenshot' : 'mobile')
  }, [hasDesktopScreenshot, hasScreenshot, mode, proxyFailed])

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

  const modes = [
    { key: 'live' as const, label: 'Live', Icon: Globe, disabled: false },
    { key: 'mobile' as const, label: 'Mobile', Icon: DeviceMobile, disabled: false },
  ]

  const modePicker = (
    <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-3 pointer-events-none">
      <div className="flex items-center gap-1 rounded-[4px] border border-edge bg-background/90 p-1 shadow-sm backdrop-blur pointer-events-auto">
        {modes.map(({ key, label, Icon, disabled }) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            disabled={disabled}
            aria-label={`${label} preview`}
            aria-pressed={mode === key}
            title={disabled ? `${label} preview unavailable` : `${label} preview`}
            className={`h-7 px-2.5 rounded-[3px] inline-flex items-center gap-1.5 text-micro transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
              mode === key ? 'bg-foreground text-background' : 'text-ink-3 hover:text-ink hover:bg-muted'
            }`}
          >
            <Icon className="w-3.5 h-3.5" weight="regular" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <a
        href={siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${domain}`}
        title={`Open ${domain}`}
        className="h-8 rounded-[4px] border border-edge bg-background/90 px-2.5 text-ink-3 hover:text-ink hover:border-foreground/25 inline-flex items-center gap-1.5 shadow-sm backdrop-blur transition-colors pointer-events-auto"
      >
        <span className="text-micro">Live link</span>
        <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
      </a>
    </div>
  )

  if (activeScreenshotUrl) {
    return (
      <div className="relative flex-1 min-h-0 overflow-auto bg-muted/35">
        {modePicker}
        <div className={`min-h-full px-4 pb-4 pt-16 ${mode === 'mobile' ? 'flex justify-center' : ''}`}>
          <img
            src={activeScreenshotUrl}
            alt={`${mode === 'mobile' ? 'Mobile' : 'Desktop'} screenshot of ${domain}`}
            className={`block rounded-[4px] border border-edge bg-background shadow-sm ${
              mode === 'mobile' ? 'w-full max-w-[390px]' : 'w-full'
            }`}
          />
        </div>
      </div>
    )
  }

  if (mode === 'mobile' && !proxyFailed) {
    return (
      <div className="relative flex-1 min-h-0 overflow-hidden bg-muted/35">
        {modePicker}
        <div className="absolute inset-x-4 bottom-4 top-16 flex justify-center">
          <div className="relative h-full w-full max-w-[390px] overflow-hidden rounded-[4px] border border-edge bg-background shadow-sm">
            {!loaded && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 pointer-events-none">
                <span className="text-meta text-ink-3">{domain}</span>
                <Spinner />
              </div>
            )}
            <iframe
              key={`${proxyUrl}-mobile`}
              src={proxyUrl}
              title={`Mobile live preview of ${siteUrl}`}
              onLoad={handleLoad}
              onError={() => setProxyFailed(true)}
              sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
              className="h-full w-full border-none"
              style={{ opacity: loaded ? 1 : 0, transition: 'opacity var(--dur-4) var(--ease-sig)' }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (proxyFailed) {
    return (
      <div className="relative flex flex-col items-center justify-center flex-1 gap-5">
        {modePicker}
        <div className="text-center space-y-1.5">
          <p className="text-meta text-ink-2">{domain}</p>
          <p className="text-micro text-ink-4">Live preview unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden min-h-0">
      {modePicker}
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
          <span className="text-meta text-ink-3">{domain}</span>
          <Spinner />
        </div>
      )}
      <iframe
        key={`${proxyUrl}-live`}
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
