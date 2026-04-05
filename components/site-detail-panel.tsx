// components/site-detail-panel.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { ArrowClockwise, Check, X } from '@phosphor-icons/react'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { AssetsTab } from './assets-tab'

interface Asset { id: number; type: 'logo' | 'icon' | 'illustration' | 'image'; content: string; width: number; height: number }
interface ColorRow { hex_value: string; oklch: string | null }
interface TypographyRow { font_family: string; role: string; google_fonts_url: string | null; primary_weight: number | null }

interface DetailData {
  id: number
  url: string
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  figma_capture_url: string | null
  extraction_error: string | null
  colors: ColorRow[]
  typography: TypographyRow[]
  assets: Asset[]
}

interface SiteDetailPanelProps {
  sourceId: number
  onClose?: () => void
}

export function SiteDetailPanel({ sourceId, onClose }: SiteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('preview')
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReextracting, setIsReextracting] = useState(false)
  const [figmaCopied, setFigmaCopied] = useState(false)
  const [figmaCopying, setFigmaCopying] = useState(false)
  const [scope, animate] = useAnimate()
  const { playPanelOpen, playClose } = useSoundsContext()

  useEffect(() => {
    playPanelOpen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    setActiveTab('preview')
    setData(null)
    fetch(`/api/design/${sourceId}`)
      .then(r => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sourceId])

  async function copyToFigma() {
    if (!data?.figma_capture_url || figmaCopying) return
    setFigmaCopying(true)
    try {
      const res = await fetch(data.figma_capture_url)
      const html = await res.text()
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
      ])
      setFigmaCopied(true)
      setTimeout(() => setFigmaCopied(false), 2000)
    } catch (err) {
      console.error('[copy-to-figma]', err)
    } finally {
      setFigmaCopying(false)
    }
  }

  async function handleReextract() {
    if (isReextracting) return
    setIsReextracting(true)

    animate(scope.current, { rotate: 360 }, {
      duration: 0.7, ease: 'linear', repeat: Infinity, repeatType: 'loop'
    })

    try {
      await fetch(`/api/design/${sourceId}/reextract`, { method: 'POST' })
      // Always re-fetch so the latest data (including any extraction_error) shows in tabs
      setLoading(true)
      setData(null)
      const updated = await fetch(`/api/design/${sourceId}`).then(r => r.json())
      setData(updated)
    } catch (err) {
      console.error('[reextract]', err)
    } finally {
      setIsReextracting(false)
      setLoading(false)
      animate(scope.current, { rotate: 0 }, { duration: 0 })
    }
  }

  const hostname = (() => {
    try { return data?.url ? new URL(data.url).hostname : '…' } catch { return data?.url ?? '…' }
  })()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{hostname}</p>
          <p className="font-mono text-[10px] text-muted-foreground truncate">{data?.url ?? ''}</p>
        </div>
        {onClose && (
          <button
            onClick={() => { playClose(); onClose() }}
            className="ml-3 flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <X className="w-3.5 h-3.5" weight="bold" />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0">
        <PanelTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center flex-1"
          >
            <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
          </motion.div>
        ) : data ? (
          <motion.div
            key={`data-${sourceId}`}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col flex-1 min-h-0"
          >
            <AnimatePresence mode="wait">
              {activeTab === 'preview' && (
                <motion.div key="preview" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
                  <PreviewTab screenshotUrl={data.screenshot_url} siteUrl={data.url} extractionError={data.extraction_error} mobileScreenshotUrl={data.mobile_screenshot_url} />
                </motion.div>
              )}
              {activeTab === 'colors' && (
                <motion.div key="colors" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
                  <ColorsTab colors={data.colors} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {activeTab === 'type' && (
                <motion.div key="type" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
                  <TypeTab typography={data.typography} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {activeTab === 'assets' && (
                <motion.div key="assets" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
                  <AssetsTab assets={data.assets} extractionError={data.extraction_error} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center flex-1 p-8"
          >
            <p className="text-xs text-muted-foreground">Failed to load</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer — always visible */}
      <div className="flex-shrink-0 border-t border-border px-4 pt-3 pb-[max(12px,var(--safe-bottom))] flex flex-col gap-2">
        <div className="flex gap-2">
          <a
            href={data?.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 flex-1 text-xs border border-border rounded-md py-2 min-h-[36px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono"
          >
            ↗ Visit site
          </a>
          <button
            type="button"
            onClick={handleReextract}
            disabled={isReextracting}
            title="Re-extract design data"
            className="flex items-center justify-center w-9 border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-40"
          >
            <motion.span ref={scope} style={{ display: 'flex' }}>
              <ArrowClockwise className="w-3 h-3" weight="regular" />
            </motion.span>
          </button>
        </div>

        {/* Figma copy action */}
        {data && (
          data.figma_capture_url ? (
            <button
              onClick={copyToFigma}
              disabled={figmaCopying}
              className={`flex items-center justify-center gap-2 w-full text-xs border rounded-md py-2 min-h-[36px] transition-all font-mono ${
                figmaCopied
                  ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
              } disabled:opacity-40`}
            >
              {figmaCopying ? (
                <span className="tracking-widest">···</span>
              ) : figmaCopied ? (
                <>
                  <Check className="w-3 h-3" weight="bold" />
                  Copied — paste in Figma with ⌘V
                </>
              ) : (
                <>
                  <span className="font-bold text-[11px] leading-none">F</span>
                  Copy layers for Figma
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center justify-center gap-1.5 w-full text-[11px] font-mono text-muted-foreground/40 border border-dashed border-border/40 rounded-md py-2 min-h-[36px]">
              <span className="font-bold text-[10px] leading-none">F</span>
              Figma layers not captured — use ↻ to re-extract
            </div>
          )
        )}
      </div>
    </div>
  )
}
