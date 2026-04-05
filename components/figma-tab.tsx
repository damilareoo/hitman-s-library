// components/figma-tab.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ArrowClockwise, DownloadSimple } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'

interface FigmaTabProps {
  siteUrl: string
  figmaCaptureUrl: string | null
  figmaHtml: string | null
  onReextract: () => void
  isReextracting: boolean
}

export function FigmaTab({ siteUrl, figmaCaptureUrl, figmaHtml, onReextract, isReextracting }: FigmaTabProps) {
  const [copied, setCopied]       = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)
  const [iframeLoaded, setLoaded] = useState(false)
  const [blocked, setBlocked]     = useState(false)
  const blockTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoaded(false)
    setBlocked(false)
    setCopied(false)
    setCopyFailed(false)
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    blockTimerRef.current = setTimeout(() => setBlocked(true), 7000)
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current) }
  }, [siteUrl])

  const htmlValid = (figmaHtml?.length ?? 0) > 5000

  const hostname = (() => {
    try { return new URL(siteUrl).hostname.replace('www.', '') } catch { return siteUrl }
  })()

  const copy = useCallback(async () => {
    if (!figmaHtml || !htmlValid) return
    setCopyFailed(false)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([figmaHtml], { type: 'text/html' }) }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 8000)
    } catch {
      setCopyFailed(true)
    }
  }, [figmaHtml, htmlValid])

  const download = useCallback(() => {
    if (!figmaHtml) return
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([figmaHtml], { type: 'text/html' })),
      download: `${hostname}-figma.html`,
    })
    a.click()
    URL.revokeObjectURL(a.href)
  }, [figmaHtml, hostname])

  // ── Not captured ──────────────────────────────────────────────────────────
  if (!figmaCaptureUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-5">
        <div className="w-full border border-dashed border-border/60 rounded-xl p-6 flex flex-col items-center gap-3 text-center">
          {isReextracting ? (
            <>
              <div className="w-5 h-5 border border-border border-t-foreground rounded-full animate-spin" />
              <p className="text-xs text-muted-foreground">Capturing Figma layers…</p>
              <p className="text-[11px] font-mono text-muted-foreground/50">This can take up to 30 seconds</p>
            </>
          ) : (
            <>
              <span className="font-black text-[32px] text-muted-foreground/20 leading-none select-none">F</span>
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Layers not yet captured</p>
                <p className="text-[11px] font-mono text-muted-foreground/60 leading-relaxed max-w-[200px]">
                  This site hasn&apos;t been processed for Figma import yet.
                </p>
              </div>
              <button
                onClick={onReextract}
                className="flex items-center gap-1.5 text-[12px] font-mono text-foreground border border-border/60 rounded-md px-3 py-2 hover:border-foreground/40 hover:bg-muted/50 transition-colors mt-1"
              >
                <ArrowClockwise className="w-3.5 h-3.5" weight="regular" />
                Capture now
              </button>
            </>
          )}
        </div>
        <p className="text-[10px] font-mono text-muted-foreground/30 text-center px-2">
          Newly added sites are processed automatically overnight
        </p>
      </div>
    )
  }

  // ── Captured ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Live preview — same as Preview tab, just a reference */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {!iframeLoaded && (
          <div className="absolute inset-0 bg-muted/30 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}
        <iframe
          key={siteUrl}
          src={siteUrl}
          title={`${hostname} — Figma preview`}
          onLoad={() => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current); setLoaded(true) }}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
        <AnimatePresence>
          {blocked && !iframeLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              className="absolute bottom-3 left-3 right-3 z-20 bg-background/95 backdrop-blur-sm border border-border rounded-lg px-3 py-2.5 flex items-center justify-between gap-2"
            >
              <p className="text-[11px] font-mono text-muted-foreground">Site may block embedding</p>
              <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] font-mono text-foreground underline underline-offset-2 shrink-0">
                Open in tab ↗
              </a>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Copy panel */}
      <div className="shrink-0 border-t border-border bg-background">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="copied"
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-4 py-3 space-y-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Copied to clipboard</span>
              </div>
              <div className="space-y-1.5">
                {[
                  ['1', 'Open Figma'],
                  ['2', 'Run the html.to.design plugin'],
                  ['3', 'Click "Paste from clipboard" — layers appear instantly'],
                ].map(([n, step]) => (
                  <div key={n} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-muted-foreground/30 mt-0.5 w-3 shrink-0">{n}.</span>
                    <p className="text-[11px] text-foreground/70">{step}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="px-3 py-2.5 flex items-center gap-2"
            >
              {copyFailed && (
                <p className="text-[10px] font-mono text-muted-foreground/50 flex-1">
                  Clipboard blocked — download the file instead
                </p>
              )}
              {!copyFailed && (
                <p className="text-[10px] font-mono text-muted-foreground/30 flex-1 truncate">
                  Requires the{' '}
                  <span className="text-foreground/40">html.to.design</span>
                  {' '}Figma plugin
                </p>
              )}
              <button
                onClick={download}
                disabled={!htmlValid}
                title="Download HTML file"
                className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/50 text-muted-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors shrink-0 disabled:opacity-30"
              >
                <DownloadSimple className="w-3.5 h-3.5" weight="regular" />
              </button>
              <button
                onClick={copy}
                disabled={!htmlValid}
                className={[
                  'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all',
                  htmlValid
                    ? 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97]'
                    : 'bg-muted text-muted-foreground/30 border border-border/30 cursor-wait',
                ].join(' ')}
              >
                Copy to Figma
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
