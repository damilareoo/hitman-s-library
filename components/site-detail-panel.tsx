// components/site-detail-panel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { ArrowClockwise, X } from '@phosphor-icons/react'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { AssetsTab } from './assets-tab'
import { Spinner } from './ui/spinner'
import { EASE, DUR } from '@/lib/motion'
import { useIsAdmin } from '@/lib/use-is-admin'
interface Asset { id: number; type: 'logo' | 'icon' | 'illustration' | 'image'; content: string; width: number; height: number }
interface ColorRow { hex_value: string; oklch: string | null }
interface TypographyRow { font_family: string; role: string; google_fonts_url: string | null; primary_weight: number | null }

interface DetailData {
  id: number
  url: string
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  extraction_error: string | null
  colors: ColorRow[]
  typography: TypographyRow[]
  assets: Asset[]
}

interface SiteMetadata {
  tags?: string[]
  designStyle?: string
  complexity?: string
  useCase?: string
  industry?: string
}

interface SiteDetailPanelProps {
  sourceId: number
  metadata?: SiteMetadata
  onClose?: () => void
}

export function SiteDetailPanel({ sourceId, metadata, onClose }: SiteDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>('preview')
  const [data, setData] = useState<DetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReextracting, setIsReextracting] = useState(false)
  const [scope, animate] = useAnimate()
  const { playPanelOpen, playClose } = useSoundsContext()
  const isAdmin = useIsAdmin()

  useEffect(() => {
    playPanelOpen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(() => {
    setLoading(true)
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

  useEffect(() => {
    setActiveTab('preview')
    load()
  }, [load])

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
      setData({
        ...updated,
        colors: Array.isArray(updated.colors) ? updated.colors : [],
        typography: Array.isArray(updated.typography) ? updated.typography : [],
        assets: Array.isArray(updated.assets) ? updated.assets : [],
      })
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
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-edge-strong flex-shrink-0">
        <div className="min-w-0 flex-1">
          <a
            href={data?.url ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-titletext text-ink truncate hover:opacity-70 transition-opacity block"
          >
            {hostname}
          </a>
          {(metadata?.industry || metadata?.tags?.[0]) && (
            <p className="text-micro text-ink-4 mt-0.5 truncate">
              {[metadata.industry, metadata.tags?.[0]].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {/* Re-extraction is an owner action — the route rejects everyone else. */}
          {isAdmin && (
            <button
              type="button"
              onClick={handleReextract}
              disabled={isReextracting}
              aria-label="Re-extract design data"
              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted transition-colors disabled:opacity-40"
            >
              <motion.span ref={scope} style={{ display: 'flex' }}>
                <ArrowClockwise className="w-4 h-4" weight="regular" />
              </motion.span>
            </button>
          )}
          {onClose && (
            <button
              onClick={() => { playClose(); onClose() }}
              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" weight="bold" />
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
            <Spinner />
          </motion.div>
        ) : data ? (
          <motion.div
            key={`data-${sourceId}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.move, ease: EASE }}
            className="flex flex-col flex-1 min-h-0"
          >
            <AnimatePresence mode="wait">
              {activeTab === 'preview' && (
                <motion.div key="preview" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <PreviewTab
                    siteUrl={data.url}
                    screenshotUrl={data.screenshot_url}
                    mobileScreenshotUrl={data.mobile_screenshot_url}
                    extractionError={data.extraction_error}
                  />
                </motion.div>
              )}
              {activeTab === 'colors' && (
                <motion.div key="colors" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <ColorsTab colors={data.colors} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {activeTab === 'type' && (
                <motion.div key="type" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <TypeTab typography={data.typography} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {activeTab === 'assets' && (
                <motion.div key="assets" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
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
            className="flex flex-col items-center justify-center flex-1 gap-3 p-8"
          >
            <p className="text-meta text-ink-3">Failed to load</p>
            <button
              onClick={load}
              className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
