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

type CopyStatus = 'idle' | 'copying' | 'copied' | 'error'

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
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [proxyFailed, setProxyFailed] = useState(false)
  const [desktopCopy, setDesktopCopy] = useState<CopyStatus>('idle')
  const [mobileCopy, setMobileCopy] = useState<CopyStatus>('idle')
  const [captureOpen, setCaptureOpen] = useState(false)
  const [captureBlocked, setCaptureBlocked] = useState(false)
  const captureCheckRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const hasMobile = Boolean(mobileScreenshotUrl)
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(siteUrl)}&picker=0`

  useEffect(() => {
    setIframeLoaded(false)
    setProxyFailed(false)
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
    const popup = window.open(captureUrl, 'figma-layers-capture', 'width=1440,height=900,scrollbars=yes,resizable=yes')
    if (!popup) {
      setCaptureBlocked(true)
      setTimeout(() => setCaptureBlocked(false), 5000)
      return
    }
    setCaptureOpen(true)
    setCaptureBlocked(false)
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

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* Toolbar — actions only */}
      <div className="shrink-0 border-b border-border/60 px-3 py-2 flex items-center gap-1.5">
        {screenshotUrl && (
          <button
            onClick={() => handleCopy('desktop')}
            disabled={desktopCopy === 'copying'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-border/60 text-[10px] font-mono transition-colors disabled:opacity-40 hover:border-foreground/30 hover:text-foreground text-muted-foreground"
          >
            {desktopCopy === 'copied'
              ? <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
              : desktopCopy === 'error'
                ? <Warning className="w-3 h-3 text-amber-500" weight="fill" />
                : <DownloadSimple className="w-3 h-3" weight="regular" />
            }
            {desktopCopy === 'copying' ? 'Copying…' : desktopCopy === 'copied' ? 'Copied!' : desktopCopy === 'error' ? 'Failed' : 'Screenshot'}
          </button>
        )}
        {hasMobile && mobileScreenshotUrl && (
          <button
            onClick={() => handleCopy('mobile')}
            disabled={mobileCopy === 'copying'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border border-border/60 text-[10px] font-mono transition-colors disabled:opacity-40 hover:border-foreground/30 hover:text-foreground text-muted-foreground"
          >
            {mobileCopy === 'copied'
              ? <Check className="w-3 h-3 text-[var(--color-success)]" weight="bold" />
              : mobileCopy === 'error'
                ? <Warning className="w-3 h-3 text-amber-500" weight="fill" />
                : <DownloadSimple className="w-3 h-3" weight="regular" />
            }
            {mobileCopy === 'copying' ? 'Copying…' : mobileCopy === 'copied' ? 'Copied!' : mobileCopy === 'error' ? 'Failed' : 'Mobile'}
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleCaptureLayers}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-[3px] border text-[10px] font-mono transition-colors border-foreground/20 bg-foreground/[0.04] text-foreground/60 hover:border-foreground/40 hover:text-foreground hover:bg-foreground/[0.07]"
        >
          <Stack className="w-3 h-3" weight="regular" />
          Layers
        </button>
      </div>

      {/* Preview */}
      <div className="flex-1 relative overflow-hidden min-h-0">
        {!iframeLoaded && !proxyFailed && (
          <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {proxyFailed ? (
          <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
            <p className="text-xs text-muted-foreground/50 leading-relaxed">
              Live preview unavailable —{' '}
              <a href={siteUrl} target="_blank" rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground transition-colors">
                open site ↗
              </a>
            </p>
          </div>
        ) : (
          <iframe
            key={siteUrl}
            src={proxyUrl}
            title={`Preview of ${siteUrl}`}
            onLoad={() => setIframeLoaded(true)}
            onError={() => setProxyFailed(true)}
            sandbox="allow-scripts allow-forms allow-popups allow-top-navigation-by-user-activation"
            className="absolute inset-0 w-full h-full border-none"
            style={{ opacity: iframeLoaded ? 1 : 0, transition: 'opacity 0.35s ease' }}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-2.5 flex items-center min-h-[38px]">
        <AnimatePresence mode="wait">
          {captureBlocked ? (
            <motion.div key="blocked" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Warning className="w-3 h-3 text-amber-500 shrink-0" weight="fill" />
              <span className="text-[11px] font-mono text-muted-foreground">
                Popup blocked — allow popups, then try again
              </span>
            </motion.div>
          ) : captureOpen ? (
            <motion.div key="capture" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Stack className="w-3 h-3 text-foreground/50 shrink-0" weight="regular" />
              <span className="text-[11px] font-mono text-foreground/60">
                Click <strong className="text-foreground/80">Copy to clipboard</strong> in the toolbar — then <span className="text-foreground/50">⌘V</span> in Figma
              </span>
            </motion.div>
          ) : (desktopCopy === 'copied' || mobileCopy === 'copied') ? (
            <motion.div key="copied" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
              <span className="text-[11px] font-mono text-[var(--color-success)]">
                Copied — paste in Figma with <span className="text-foreground/50">⌘V</span>
              </span>
            </motion.div>
          ) : (desktopCopy === 'error' || mobileCopy === 'error') ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <Warning className="w-3 h-3 text-amber-500 shrink-0" weight="fill" />
              <span className="text-[11px] font-mono text-muted-foreground">Copy failed — try again</span>
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/25 shrink-0" />
              <span className="text-[11px] font-mono text-muted-foreground/45">
                Screenshot → flat PNG · Layers → editable Figma layers
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  )
}
