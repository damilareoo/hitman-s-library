// components/figma-tab.tsx
'use client'

import { useState } from 'react'
import { Check, ArrowClockwise } from '@phosphor-icons/react'

interface FigmaTabProps {
  figmaCaptureUrl: string | null
  onReextract: () => void
  isReextracting: boolean
}

export function FigmaTab({ figmaCaptureUrl, onReextract, isReextracting }: FigmaTabProps) {
  const [copied, setCopied] = useState(false)
  const [copying, setCopying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function copyToFigma() {
    if (!figmaCaptureUrl || copying) return
    setCopying(true)
    setError(null)
    try {
      const res = await fetch(figmaCaptureUrl)
      const html = await res.text()
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ])
      setCopied(true)
      setTimeout(() => setCopied(false), 5000)
    } catch {
      setError('Clipboard access denied. Make sure you\'re on HTTPS and try again.')
    } finally {
      setCopying(false)
    }
  }

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
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Ready indicator */}
      <div className="px-4 pt-4 pb-0 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_4px_rgba(34,197,94,0.6)]" />
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/50">Layers ready</span>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Card */}
        <div className="border border-border/60 rounded-xl overflow-hidden">
          {/* Card header */}
          <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-muted/20 flex items-start gap-3">
            <span className="font-black text-[26px] leading-none text-foreground/70 mt-0.5 select-none">F</span>
            <div>
              <p className="text-sm font-semibold text-foreground tracking-[-0.01em]">Figma Layers</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Pixel-perfect HTML/CSS — paste directly as editable layers.
              </p>
            </div>
          </div>

          {/* Copy button */}
          <div className="p-3">
            <button
              onClick={copyToFigma}
              disabled={copying}
              className={[
                'w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold tracking-[-0.01em] transition-all duration-200',
                copied
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-foreground text-background hover:bg-foreground/90 active:scale-[0.98]',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              ].join(' ')}
            >
              {copying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Copying…
                </>
              ) : copied ? (
                <>
                  <Check className="w-4 h-4" weight="bold" />
                  Copied — paste in Figma now
                </>
              ) : (
                'Copy Figma Layers'
              )}
            </button>

            {error && (
              <p className="text-[11px] font-mono text-destructive mt-2 text-center leading-relaxed">{error}</p>
            )}
          </div>
        </div>

        {/* Steps */}
        {copied ? (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 space-y-2.5">
            <p className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              Next steps
            </p>
            {[
              'Switch to Figma',
              'Press ⌘V (Mac) or Ctrl+V (Win)',
              'Layers paste as an editable frame',
            ].map((step, i) => (
              <div key={step} className="flex items-start gap-2.5">
                <span className="font-mono text-[10px] text-emerald-600/60 dark:text-emerald-400/60 mt-0.5 w-3 shrink-0 tabular-nums">{i + 1}.</span>
                <p className="text-[12px] text-foreground/80">{step}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 px-1">
            {[
              ['1', 'Click Copy Figma Layers'],
              ['2', 'Switch to your Figma file'],
              ['3', 'Press ⌘V to paste'],
            ].map(([n, step]) => (
              <div key={n} className="flex items-start gap-2.5">
                <span className="font-mono text-[10px] text-muted-foreground/30 mt-0.5 w-3 shrink-0 tabular-nums">{n}.</span>
                <p className="text-[12px] text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
