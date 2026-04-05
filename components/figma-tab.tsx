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

type CaptureMode = 'full' | 'element'

interface SelectedElement {
  html: string
  label: string
}

export function FigmaTab({ siteUrl, figmaCaptureUrl, onReextract, isReextracting }: FigmaTabProps) {
  const [mode, setMode] = useState<CaptureMode>('full')
  const [hoverLabel, setHoverLabel] = useState<string | null>(null)
  const [selected, setSelected] = useState<SelectedElement | null>(null)

  // Full-page copy state
  const [fullCopied, setFullCopied] = useState(false)
  const [fullCopying, setFullCopying] = useState(false)
  const [fullError, setFullError] = useState<string | null>(null)

  // Element capture state
  const [elemCapturing, setElemCapturing] = useState(false)
  const [elemCopied, setElemCopied] = useState(false)
  const [elemError, setElemError] = useState<string | null>(null)

  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Listen for postMessage events from the proxied iframe
  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return
      if (e.data.type === 'figma-hover') {
        setHoverLabel(e.data.label ?? null)
      } else if (e.data.type === 'figma-element-selected') {
        setSelected({ html: e.data.html, label: e.data.label })
        setElemCopied(false)
        setElemError(null)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Reset selection when mode changes
  useEffect(() => {
    setSelected(null)
    setHoverLabel(null)
    setElemError(null)
  }, [mode])

  const copyFullPage = useCallback(async () => {
    if (!figmaCaptureUrl || fullCopying) return
    setFullCopying(true)
    setFullError(null)
    try {
      const res = await fetch(figmaCaptureUrl)
      const html = await res.text()
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ])
      setFullCopied(true)
      setTimeout(() => setFullCopied(false), 5000)
    } catch {
      setFullError('Clipboard access denied. Make sure you\'re on HTTPS and try again.')
    } finally {
      setFullCopying(false)
    }
  }, [figmaCaptureUrl, fullCopying])

  const copyElement = useCallback(async () => {
    if (!selected || elemCapturing) return
    setElemCapturing(true)
    setElemError(null)
    try {
      const res = await fetch('/api/design/capture-element', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: selected.html, siteUrl }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json()
      const htmlRes = await fetch(url)
      const figmaHtml = await htmlRes.text()
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([figmaHtml], { type: 'text/html' }) })
      ])
      setElemCopied(true)
      setTimeout(() => setElemCopied(false), 5000)
    } catch (err) {
      setElemError(String(err).replace('Error: ', ''))
    } finally {
      setElemCapturing(false)
    }
  }, [selected, elemCapturing, siteUrl])

  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}`

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mode toggle + status bar */}
      <div className="flex items-center border-b border-border/40 shrink-0 bg-background">
        <button
          onClick={() => setMode('full')}
          className={`flex-1 py-1.5 text-[10px] font-mono transition-colors ${mode === 'full' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Full page
        </button>
        <button
          onClick={() => setMode('element')}
          className={`flex-1 py-1.5 text-[10px] font-mono border-l border-border/40 transition-colors ${mode === 'element' ? 'text-foreground bg-muted' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Pick element
        </button>
      </div>

      {mode === 'full' ? (
        /* ── Full-page mode ── */
        <div className="flex-1 flex flex-col overflow-y-auto">
          {figmaCaptureUrl ? (
            <>
              <div className="px-4 pt-4 pb-0 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Layers ready</span>
              </div>

              <div className="p-4 flex flex-col gap-3">
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-muted/20 flex items-start gap-3">
                    <span className="font-black text-[26px] leading-none text-foreground/70 mt-0.5 select-none">F</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground tracking-[-0.01em]">Figma Layers</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        Full page — paste directly as editable layers.
                      </p>
                    </div>
                  </div>
                  <div className="p-3">
                    <button
                      onClick={copyFullPage}
                      disabled={fullCopying}
                      className={[
                        'w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold tracking-[-0.01em] transition-all duration-200',
                        fullCopied
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                      ].join(' ')}
                    >
                      {fullCopying ? (
                        <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Copying…</>
                      ) : fullCopied ? (
                        <><Check className="w-4 h-4" weight="bold" />Copied — paste in Figma now</>
                      ) : 'Copy Figma Layers'}
                    </button>
                    {fullError && (
                      <p className="text-[11px] font-mono text-destructive mt-2 text-center leading-relaxed">{fullError}</p>
                    )}
                  </div>
                </div>

                {fullCopied ? (
                  <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 space-y-2.5">
                    <p className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Next steps</p>
                    {['Switch to Figma', 'Press ⌘V (Mac) or Ctrl+V (Win)', 'Layers paste as an editable frame'].map((step, i) => (
                      <div key={step} className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5 w-3 shrink-0 tabular-nums">{i + 1}.</span>
                        <p className="text-[12px] text-foreground/80">{step}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 px-1">
                    {[['1', 'Click Copy Figma Layers'], ['2', 'Switch to your Figma file'], ['3', 'Press ⌘V to paste']].map(([n, step]) => (
                      <div key={n} className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] text-muted-foreground/30 mt-0.5 w-3 shrink-0 tabular-nums">{n}.</span>
                        <p className="text-[12px] text-muted-foreground">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
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
                        This site hasn't been processed for Figma import yet.
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
          )}
        </div>
      ) : (
        /* ── Element picker mode ── */
        <div className="flex flex-col flex-1 min-h-0 relative">
          {/* Hover label pill */}
          <AnimatePresence>
            {hoverLabel && !selected && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
              >
                <span className="bg-[#18A0FB] text-white text-[10px] font-mono px-2 py-0.5 rounded-full shadow-md whitespace-nowrap">
                  {hoverLabel}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Proxied iframe */}
          <div className="flex-1 overflow-hidden relative min-h-0">
            <iframe
              ref={iframeRef}
              key={proxyUrl}
              src={proxyUrl}
              title="Element picker"
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </div>

          {/* Selected element panel */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="shrink-0 border-t border-border bg-background px-3 py-2.5 flex items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-mono text-muted-foreground/50 truncate">
                    Selected: <span className="text-foreground/70">{selected.label}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="w-5 h-5 flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0"
                  aria-label="Deselect"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
                <button
                  onClick={copyElement}
                  disabled={elemCapturing}
                  className={[
                    'shrink-0 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-mono font-semibold transition-all',
                    elemCopied
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97]',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  ].join(' ')}
                >
                  {elemCapturing ? (
                    <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />Processing…</>
                  ) : elemCopied ? (
                    <><Check className="w-3 h-3" weight="bold" />Paste in Figma</>
                  ) : 'Copy to Figma'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {elemError && (
            <div className="shrink-0 px-3 pb-2">
              <p className="text-[11px] font-mono text-destructive text-center">{elemError}</p>
            </div>
          )}

          {/* Hint when nothing selected */}
          {!selected && (
            <div className="shrink-0 border-t border-border/40 px-3 py-2 text-center">
              <p className="text-[10px] font-mono text-muted-foreground/30">
                Click any element to copy it as Figma layers
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
