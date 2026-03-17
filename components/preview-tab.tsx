// components/preview-tab.tsx
'use client'

import { useRef, useEffect, useState } from 'react'

interface PreviewTabProps {
  screenshotUrl: string | null
  siteUrl: string
  extractionError?: string | null
}

export function PreviewTab({ screenshotUrl, siteUrl, extractionError }: PreviewTabProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    setShowHint(true)
    if (scrollRef.current) scrollRef.current.scrollTop = 0
  }, [screenshotUrl])

  function handleScroll() {
    if (scrollRef.current?.scrollTop && scrollRef.current.scrollTop > 50) {
      setShowHint(false)
    }
  }

  if (!screenshotUrl) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8">
        <div className="w-full rounded-md border border-border p-6 text-center">
          <p className="font-mono text-sm text-muted-foreground">
            {(() => { try { return new URL(siteUrl).hostname } catch { return siteUrl } })()}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">Screenshot unavailable</p>
          {extractionError && (
            <p className="font-mono text-[10px] text-destructive/70 mt-3 break-words">{extractionError}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overflow-x-hidden"
        style={{ scrollbarWidth: 'thin' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl}
          alt={`Screenshot of ${siteUrl}`}
          className="w-full h-auto block"
          loading="lazy"
        />
      </div>

      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-12 flex items-end justify-center pb-2 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, var(--background) 0%, transparent 100%)',
          opacity: showHint ? 1 : 0,
        }}
      >
        <span className="font-mono text-[10px] text-muted-foreground/40">
          scroll to explore ↓
        </span>
      </div>
    </div>
  )
}
