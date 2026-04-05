// components/figma-tab.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ArrowClockwise, DownloadSimple, Warning } from '@phosphor-icons/react'
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
  const [copyError, setCopyError] = useState(false)
  const [iframeLoaded, setLoaded] = useState(false)
  const [blocked, setBlocked]     = useState(false)
  const blockTimerRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setLoaded(false)
    setBlocked(false)
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    blockTimerRef.current = setTimeout(() => setBlocked(true), 7000)
    return () => { if (blockTimerRef.current) clearTimeout(blockTimerRef.current) }
  }, [siteUrl])

  // Validate the HTML has real content — empty or tiny strings mean capture failed silently
  const htmlBytes   = figmaHtml?.length ?? 0
  const htmlIsValid = htmlBytes > 5000   // real capture output is typically 50KB–5MB

  const copyToFigma = useCallback(async () => {
    if (!figmaHtml || !htmlIsValid) return
    setCopyError(false)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([figmaHtml], { type: 'text/html' }) }),
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 6000)
    } catch {
      // Clipboard write failed (permission denied, browser restriction, etc.)
      // Fall through to the download path shown in the UI
      setCopyError(true)
    }
  }, [figmaHtml, htmlIsValid])

  const downloadHtml = useCallback(() => {
    if (!figmaHtml) return
    const blob = new Blob([figmaHtml], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    try { a.href = url; a.download = `${hostname}-figma.html`; a.click() }
    finally { URL.revokeObjectURL(url) }
  }, [figmaHtml]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleIframeLoad() {
    if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
    setLoaded(true)
  }

  const hostname = (() => {
    try { return new URL(siteUrl).hostname.replace('www.', '') } catch { return siteUrl }
  })()

  const ready = !!figmaCaptureUrl && htmlIsValid

  // ── Not captured yet ──────────────────────────────────────────────────────
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

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0 bg-background">
        <span className="font-black text-[14px] leading-none text-foreground/40 select-none">F</span>
        <span className="text-[11px] font-mono text-muted-foreground/40 truncate flex-1 min-w-0">
          {hostname}
        </span>

        {/* Download fallback — always available once captured */}
        {htmlIsValid && (
          <button
            onClick={downloadHtml}
            title="Download HTML file for Figma import"
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/50 text-muted-foreground/50 hover:text-foreground hover:border-foreground/30 transition-colors shrink-0"
          >
            <DownloadSimple className="w-3.5 h-3.5" weight="regular" />
          </button>
        )}

        {/* Primary copy button */}
        <button
          onClick={copyToFigma}
          disabled={!ready}
          className={[
            'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all',
            copied
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : copyError
                ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                : ready
                  ? 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97]'
                  : 'bg-muted text-muted-foreground/30 border border-border/30 cursor-wait',
          ].join(' ')}
        >
          {copied ? (
            <><Check className="w-3 h-3" weight="bold" />Paste in Figma</>
          ) : copyError ? (
            <><Warning className="w-3 h-3" weight="bold" />Use download ↙</>
          ) : ready ? (
            'Copy to Figma'
          ) : (
            '…'
          )}
        </button>
      </div>

      {/* Live preview */}
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
          onLoad={handleIframeLoad}
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />

        <AnimatePresence>
          {blocked && !iframeLoaded && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
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

      {/* Footer hint — changes based on state */}
      <div className="shrink-0 border-t border-border/40 px-3 py-1.5 text-center">
        <p className="text-[10px] font-mono text-muted-foreground/30">
          {copied
            ? 'Switch to Figma · press ⌘V · layers paste as editable frames'
            : copyError
              ? 'Clipboard blocked — download the HTML and import via Figma › Plugins › html.to.design'
              : ready
                ? 'Copy to Figma — or download HTML to import via the html.to.design plugin'
                : 'Preparing layers…'
          }
        </p>
      </div>
    </div>
  )
}
