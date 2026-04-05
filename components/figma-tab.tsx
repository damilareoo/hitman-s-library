// components/figma-tab.tsx
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ArrowClockwise, X } from '@phosphor-icons/react'
import { AnimatePresence, motion } from 'motion/react'

interface FigmaTabProps {
  siteUrl: string
  figmaCaptureUrl: string | null
  onReextract: () => void
  isReextracting: boolean
}

interface SelectedElement {
  html: string
  label: string
}

export function FigmaTab({ siteUrl, figmaCaptureUrl, onReextract, isReextracting }: FigmaTabProps) {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedElement | null>(null)

  // Full-page copy state — pre-fetched so copy is instant
  const fullPageHtmlRef = useRef<string | null>(null)
  const [fullPageReady, setFullPageReady] = useState(false)
  const [fullCopied, setFullCopied] = useState(false)
  const [fullCopying, setFullCopying] = useState(false)
  const [fullError, setFullError] = useState<string | null>(null)

  // Element copy state
  const [elemCopied, setElemCopied] = useState(false)

  // Pre-fetch full-page Figma HTML when capture URL is available
  useEffect(() => {
    if (!figmaCaptureUrl) return
    let cancelled = false
    setFullPageReady(false)
    fullPageHtmlRef.current = null
    fetch(figmaCaptureUrl)
      .then(r => r.text())
      .then(html => {
        if (cancelled) return
        fullPageHtmlRef.current = html
        setFullPageReady(true)
      })
      .catch(() => {
        if (!cancelled) setFullPageReady(false)
      })
    return () => { cancelled = true }
  }, [figmaCaptureUrl])

  // Listen for postMessage from proxied iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'figma-hover') {
        setHoverLabel(e.data.label ?? null)
      } else if (e.data.type === 'figma-element-selected') {
        setSelected({ html: e.data.html, label: e.data.label })
        setElemCopied(false)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const copyFullPage = useCallback(async () => {
    if (fullCopying) return
    const html = fullPageHtmlRef.current
    if (!html) {
      setFullError('Layers not loaded yet — try again in a moment.')
      return
    }
    setFullCopying(true)
    setFullError(null)
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ])
      setFullCopied(true)
      setTimeout(() => setFullCopied(false), 5000)
    } catch {
      setFullError('Clipboard access denied. Make sure you\'re on HTTPS.')
    } finally {
      setFullCopying(false)
    }
  }, [fullCopying])

  const copyElement = useCallback(async () => {
    if (!selected) return
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([selected.html], { type: 'text/html' }) })
      ])
      setElemCopied(true)
      setTimeout(() => setElemCopied(false), 5000)
    } catch {
      // silently ignore — user will see no feedback change
    }
  }, [selected])

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}`

  const hostname = (() => {
    try { return new URL(siteUrl).hostname.replace('www.', '') } catch { return siteUrl }
  })()

  // No capture yet
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

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Action bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/40 shrink-0 bg-background">
        <span className="font-black text-[14px] leading-none text-foreground/50 select-none">F</span>
        <span className="text-[11px] font-mono text-muted-foreground/50 truncate flex-1">{hostname}</span>

        {fullError && (
          <span className="text-[10px] font-mono text-destructive shrink-0">{fullError}</span>
        )}

        <button
          onClick={copyFullPage}
          disabled={fullCopying || (!fullPageReady && !fullCopied)}
          className={[
            'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all',
            fullCopied
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : fullPageReady
                ? 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97]'
                : 'bg-muted text-muted-foreground border border-border/50 cursor-wait',
          ].join(' ')}
        >
          {fullCopied ? (
            <><Check className="w-3 h-3" weight="bold" />Paste in Figma</>
          ) : fullPageReady ? (
            'Copy full page'
          ) : (
            'Loading…'
          )}
        </button>
      </div>

      {/* Proxied iframe with element picker */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        {/* Hover label */}
        <AnimatePresence>
          {hoverLabel && !selected && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            >
              <span className="bg-[#18A0FB] text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-md whitespace-nowrap max-w-[220px] truncate block">
                {hoverLabel}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <iframe
          key={proxyUrl}
          src={proxyUrl}
          title="Figma element picker"
          className="w-full h-full border-none"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>

      {/* Selected element tray */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="shrink-0 border-t border-border bg-background px-3 py-2.5 flex items-center gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-muted-foreground/50 truncate">
                <span className="text-foreground/60">{selected.label}</span>
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-5 h-5 flex items-center justify-center text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
              aria-label="Deselect element"
            >
              <X className="w-3 h-3" weight="bold" />
            </button>
            <button
              onClick={copyElement}
              className={[
                'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all',
                elemCopied
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97]',
              ].join(' ')}
            >
              {elemCopied ? (
                <><Check className="w-3 h-3" weight="bold" />Paste in Figma</>
              ) : 'Copy element'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint */}
      {!selected && (
        <div className="shrink-0 border-t border-border/40 px-3 py-1.5 text-center">
          <p className="text-[10px] font-mono text-muted-foreground/30">
            Hover to inspect · click to copy element · or copy the full page above
          </p>
        </div>
      )}
    </div>
  )
}
