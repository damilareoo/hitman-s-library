// components/figma-tab.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DownloadSimple, Check, Warning, Stack } from '@phosphor-icons/react'

interface FigmaTabProps {
  siteUrl: string
  screenshotUrl?: string | null
  mobileScreenshotUrl?: string | null
  figmaCaptureUrl?: string | null
}

type Breakpoint = 'responsive' | 'mobile' | 'tablet' | 'desktop'
type CopyStatus = 'idle' | 'copying' | 'copied' | 'error'

const BP_PX: Record<Exclude<Breakpoint, 'responsive'>, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1440,
}

const BP_LABEL: Record<Breakpoint, string> = {
  responsive: 'Auto',
  mobile: '390',
  tablet: '768',
  desktop: '1440',
}

async function copyScreenshotAsImage(imageUrl: string): Promise<void> {
  const response = await fetch(imageUrl)
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Image failed to load'))
      img.src = blobUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)

    const pngBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png')
    )

    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

export function FigmaTab({ siteUrl, screenshotUrl, mobileScreenshotUrl }: FigmaTabProps) {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('responsive')
  const [outerWidth, setOuterWidth] = useState(0)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop')
  const [desktopCopy, setDesktopCopy] = useState<CopyStatus>('idle')
  const [mobileCopy, setMobileCopy] = useState<CopyStatus>('idle')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureBlocked, setCaptureBlocked] = useState(false)
  const captureCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const outerRef = useRef<HTMLDivElement>(null)

  const hasMobile = Boolean(mobileScreenshotUrl)
  const activeScreenshot = hasMobile && viewport === 'mobile' ? mobileScreenshotUrl! : (screenshotUrl ?? null)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`

  useEffect(() => {
    if (!outerRef.current) return
    const obs = new ResizeObserver(([entry]) => setOuterWidth(entry.contentRect.width))
    obs.observe(outerRef.current)
    setOuterWidth(outerRef.current.getBoundingClientRect().width)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    setBreakpoint('responsive')
    setIframeLoaded(false)
    setProxyFailed(false)
    setViewport('desktop')
    setDesktopCopy('idle')
    setMobileCopy('idle')
    setCaptureOpen(false)
    setCaptureBlocked(false)
    if (captureCheckRef.current) clearInterval(captureCheckRef.current)
  }, [siteUrl])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.data?.type === 'proxy-failed') setProxyFailed(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    return () => { if (captureCheckRef.current) clearInterval(captureCheckRef.current) }
  }, [])

  function handleCaptureLayers() {
    if (captureCheckRef.current) clearInterval(captureCheckRef.current)
    const captureUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&capture=1`
    // Fixed window name reuses the same popup if already open
    const popup = window.open(captureUrl, 'figma-layers-capture', 'width=1440,height=900,scrollbars=yes,resizable=yes')
    if (!popup) {
      setCaptureBlocked(true)
      setTimeout(() => setCaptureBlocked(false), 5000)
      return
    }
    setCaptureOpen(true)
    setCaptureBlocked(false)
    // Poll until the popup closes, then clear the status
    captureCheckRef.current = setInterval(() => {
      if (popup.closed) {
        setCaptureOpen(false)
        if (captureCheckRef.current) clearInterval(captureCheckRef.current)
      }
    }, 600)
  }

  async function handleCopy(which: 'desktop' | 'mobile') {
    const url = which === 'mobile' ? mobileScreenshotUrl : screenshotUrl
    if (!url) return
    const setter = which === 'desktop' ? setDesktopCopy : setMobileCopy
    setter('copying')
    try {
      await copyScreenshotAsImage(url)
      setter('copied')
      setTimeout(() => setter('idle'), 5000)
    } catch {
      setter('error')
      setTimeout(() => setter('idle'), 3000)
    }
  }

  const bpPx = breakpoint !== 'responsive' ? BP_PX[breakpoint] : null
  const scale = bpPx && outerWidth > 0 ? outerWidth / bpPx : 1

  function CopyBtn({ which, status }: { which: 'desktop' | 'mobile'; status: CopyStatus }) {
    return (
      <button
        onClick={() => handleCopy(which)}
        disabled={status === 'copying'}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-border/60 text-[10px] font-mono transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-foreground/30 hover:text-foreground text-muted-foreground"
      >
        {status === 'copied'
          ? <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
          : status === 'error'
            ? <Warning className="w-3 h-3 text-amber-500" weight="fill" />
            : <DownloadSimple className="w-3 h-3" weight="regular" />
        }
        {status === 'copying' ? 'Copying…' : status === 'copied' ? 'Copied!' : status === 'error' ? 'Failed' : which === 'desktop' ? 'Desktop' : 'Mobile'}
      </button>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Toolbar */}
      <div className="shrink-0 border-b border-border px-3 py-1.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-0.5">
          {(['responsive', 'mobile', 'tablet', 'desktop'] as Breakpoint[]).map(bp => (
            <button
              key={bp}
              onClick={() => setBreakpoint(bp)}
              className={[
                'px-2 py-0.5 rounded-[3px] text-[10px] font-mono transition-colors',
                breakpoint === bp
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground/60 hover:text-muted-foreground',
              ].join(' ')}
            >
              {BP_LABEL[bp]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {screenshotUrl && <CopyBtn which="desktop" status={desktopCopy} />}
          {hasMobile && mobileScreenshotUrl && <CopyBtn which="mobile" status={mobileCopy} />}
          <div className="w-px h-4 bg-border/60 mx-0.5" />
          <button
            onClick={handleCaptureLayers}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-[10px] font-mono transition-colors border-foreground/20 bg-foreground/[0.04] text-foreground/60 hover:border-foreground/40 hover:text-foreground hover:bg-foreground/[0.07]"
          >
            <Stack className="w-3 h-3" weight="regular" />
            Layers
          </button>
        </div>
      </div>

      {/* Preview */}
      <div ref={outerRef} className="flex-1 relative overflow-hidden min-h-0">
        {!iframeLoaded && !proxyFailed && (
          <div className="absolute inset-0 bg-muted/30 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {proxyFailed ? (
          <div className="absolute inset-0 flex flex-col">
            {hasMobile && activeScreenshot && (
              <div className="flex border-b border-border/40 shrink-0">
                <button
                  onClick={() => setViewport('desktop')}
                  className={`flex-1 py-1 text-[9px] font-mono transition-colors ${viewport === 'desktop' ? 'text-foreground bg-muted/60' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setViewport('mobile')}
                  className={`flex-1 py-1 text-[9px] font-mono border-l border-border/40 transition-colors ${viewport === 'mobile' ? 'text-foreground bg-muted/60' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Mobile
                </button>
              </div>
            )}
            {activeScreenshot ? (
              <div className="flex-1 overflow-auto">
                <img src={activeScreenshot} alt="Site screenshot" className="w-full" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <p className="text-xs text-muted-foreground max-w-[220px] leading-relaxed">
                  This site blocked the live preview.
                </p>
              </div>
            )}
          </div>
        ) : (
          <iframe
            key={siteUrl}
            src={proxyUrl}
            title={`Preview of ${siteUrl}`}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setProxyFailed(true)}
            sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            style={bpPx ? {
              position: 'absolute', top: 0, left: 0,
              width: `${bpPx}px`,
              height: `calc(100% / ${scale})`,
              border: 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            } : {
              position: 'absolute', top: 0, left: 0,
              width: '100%', height: '100%', border: 'none',
            }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-2.5 flex items-center min-h-[40px]">
        <AnimatePresence mode="wait">
          {captureBlocked ? (
            <motion.div key="blocked" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Warning className="w-3 h-3 text-amber-500 shrink-0" weight="fill" />
              <span className="text-[11px] font-mono text-muted-foreground">
                Popup blocked — allow popups for this site in your browser, then try again
              </span>
            </motion.div>
          ) : captureOpen ? (
            <motion.div key="capture" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Stack className="w-3 h-3 text-foreground/50 shrink-0" weight="regular" />
              <span className="text-[11px] font-mono text-foreground/60">
                Click <strong className="text-foreground/80">Copy to clipboard</strong> in the toolbar that appeared — then <span className="text-foreground/50">⌘V</span> in Figma for real layers
              </span>
            </motion.div>
          ) : (desktopCopy === 'copied' || mobileCopy === 'copied') ? (
            <motion.div key="copied" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
              <span className="text-[11px] font-mono text-[var(--color-success)]">
                Screenshot copied — paste in Figma with <span className="text-foreground/50">⌘V</span>
              </span>
            </motion.div>
          ) : (desktopCopy === 'error' || mobileCopy === 'error') ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Warning className="w-3 h-3 text-amber-500 shrink-0" weight="fill" />
              <span className="text-[11px] font-mono text-muted-foreground">Copy failed — try again</span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground/50">
                Screenshot → flat PNG · Layers → real editable Figma layers, no plugin
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
