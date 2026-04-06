// components/site-detail-panel.tsx
'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { ArrowClockwise, X } from '@phosphor-icons/react'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { AssetsTab } from './assets-tab'
import { FigmaTab } from './figma-tab'

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
      .then(raw => {
        if (!raw || raw.error) return
        setData({
          ...raw,
          colors: Array.isArray(raw.colors) ? raw.colors : [],
          typography: Array.isArray(raw.typography) ? raw.typography : [],
          assets: Array.isArray(raw.assets) ? raw.assets : [],
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sourceId])

  async function handleReextract() {
    if (isReextracting) return
    setIsReextracting(true)

    animate(scope.current, { rotate: 360 }, {
      duration: 0.7, ease: 'linear', repeat: Infinity, repeatType: 'loop'
    })

    try {
      await fetch(`/api/design/${sourceId}/reextract`, { method: 'POST' })
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
    try { return data?.url ? new URL(data.url).hostname.replace('www.', '') : '…' } catch { return data?.url ?? '…' }
  })()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground truncate tracking-[-0.01em]">{hostname}</p>
        </div>
        {/* Quick actions in header */}
        <div className="flex items-center gap-1 shrink-0">
          <a
            href={data?.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors text-xs font-mono"
            title="Visit site"
            aria-label="Visit site"
          >
            ↗
          </a>
          <button
            type="button"
            onClick={handleReextract}
            disabled={isReextracting}
            title="Re-extract design data"
            className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-40"
          >
            <motion.span ref={scope} style={{ display: 'flex' }}>
              <ArrowClockwise className="w-3 h-3" weight="regular" />
            </motion.span>
          </button>
          {onClose && (
            <button
              onClick={() => { playClose(); onClose() }}
              className="w-7 h-7 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Close panel"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
          )}
        </div>
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
                  <PreviewTab
                    siteUrl={data.url}
                    extractionError={data.extraction_error}
                  />
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
              {activeTab === 'figma' && (
                <motion.div key="figma" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}>
                  <FigmaTab siteUrl={data.url} screenshotUrl={data.screenshot_url} />
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
    </div>
  )
}
