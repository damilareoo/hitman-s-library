// components/figma-tab.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Warning } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'

interface FigmaTabProps {
  siteUrl: string
}

export function FigmaTab({ siteUrl }: FigmaTabProps) {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'capturing' | 'copied' | 'error'>('idle')
  const [captureLabel, setCaptureLabel] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}`

  useEffect(() => {
    setHoverLabel(null)
    setStatus('idle')
    setCaptureLabel(null)
    setIframeLoaded(false)
    setProxyFailed(false)
  }, [siteUrl])

  const handleMessage = useCallback((e: MessageEvent) => {
    const data = e.data ?? {}
    if (data.type === 'figma-hover') {
      setHoverLabel(data.label ?? null)
    } else if (data.type === 'figma-element-capturing') {
      setStatus('capturing')
      setCaptureLabel(data.label ?? null)
    } else if (data.type === 'figma-element-captured') {
      const html = data.html as string
      const done = () => { setStatus('copied'); setTimeout(() => setStatus('idle'), 5000) }
      const fail = () => setStatus('error')

      if (navigator.clipboard?.write) {
        navigator.clipboard
          .write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })])
          .then(done)
          .catch(() => navigator.clipboard.writeText(html).then(done).catch(fail))
      } else if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(html).then(done).catch(fail)
      } else {
        fail()
      }
    } else if (data.type === 'figma-element-error') {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Proxy iframe — live site with element picker injected */}
      <div className="flex-1 relative overflow-hidden min-h-0">

        {/* Loading shimmer */}
        {!iframeLoaded && !proxyFailed && (
          <div className="absolute inset-0 bg-muted/30 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {/* Proxy failed — show direct iframe fallback with info */}
        {proxyFailed ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
              This site couldn&apos;t be proxied. Visit it directly to inspect elements.
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
        ) : (
          <iframe
            key={siteUrl}
            src={proxyUrl}
            title="Click any section or element to copy Figma layers"
            onLoad={() => setIframeLoaded(true)}
            onError={() => setProxyFailed(true)}
            className="w-full h-full border-none"
          />
        )}

        {/* Hover label badge */}
        <AnimatePresence>
          {hoverLabel && status === 'idle' && iframeLoaded && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute top-2 left-2 z-20 pointer-events-none"
            >
              <span className="inline-flex items-center gap-1.5 bg-background/95 backdrop-blur-sm border border-[#18A0FB]/30 rounded px-2 py-1 text-[11px] font-mono text-foreground/60 max-w-[200px] truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#18A0FB] shrink-0" />
                {hoverLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Extracting overlay — brief, only while building the HTML */}
        <AnimatePresence>
          {status === 'capturing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[2px] flex items-center justify-center"
            >
              <div className="flex items-center gap-2.5 bg-background border border-border rounded-lg px-4 py-3 shadow-sm">
                <div className="w-3.5 h-3.5 border border-border border-t-foreground rounded-full animate-spin" />
                <span className="text-[12px] font-mono text-foreground/70">
                  Extracting {captureLabel ?? 'element'}…
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-2.5 flex items-center min-h-[40px]">
        <AnimatePresence mode="wait">
          {status === 'copied' && (
            <motion.div
              key="copied"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 w-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                Copied — paste in Figma using the{' '}
                <span className="text-foreground/50">html.to.design</span>
                {' '}plugin
              </span>
            </motion.div>
          )}
          {status === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 w-full"
            >
              <Warning className="w-3 h-3 text-amber-500 shrink-0" weight="fill" />
              <span className="text-[11px] font-mono text-muted-foreground">
                Capture failed — try selecting a containing section
              </span>
            </motion.div>
          )}
          {(status === 'idle' || status === 'capturing') && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 w-full"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#18A0FB]/50 shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground/50">
                Hover to inspect · click to copy as Figma layers
              </span>
              <span className="ml-auto text-[10px] font-mono text-muted-foreground/30 shrink-0 hidden sm:block">
                html.to.design
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
