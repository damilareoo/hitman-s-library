// components/site-detail-panel.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowUpRight, X } from '@phosphor-icons/react'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { Spinner } from './ui/spinner'
import { EASE, DUR } from '@/lib/motion'
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
  const { playPanelOpen, playClose } = useSoundsContext()

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
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [sourceId])

  useEffect(() => {
    setActiveTab('preview')
    load()
  }, [load])

  const hostname = (() => {
    try { return data?.url ? new URL(data.url).hostname.replace('www.', '') : '…' } catch { return data?.url ?? '…' }
  })()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3.5 border-b border-edge-strong flex-shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-titletext text-ink truncate">
            {hostname}
          </p>
          {(metadata?.industry || metadata?.tags?.[0]) && (
            <p className="text-micro text-ink-4 mt-0.5 truncate">
              {[metadata.industry, metadata.tags?.[0]].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {data?.url && (
            <a
              href={data.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${hostname}`}
              title={`Open ${hostname}`}
              className="h-8 rounded-[6px] border border-transparent px-2.5 text-ink-2 hover:text-ink hover:bg-muted active:scale-[0.98] inline-flex items-center gap-1.5 transition-[background-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)]"
            >
              <span className="text-micro">Live link</span>
              <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
            </a>
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
                    displayMode="live"
                  />
                </motion.div>
              )}
              {activeTab === 'mobile' && (
                <motion.div key="mobile" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <PreviewTab
                    siteUrl={data.url}
                    screenshotUrl={data.screenshot_url}
                    mobileScreenshotUrl={data.mobile_screenshot_url}
                    extractionError={data.extraction_error}
                    displayMode="mobile"
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
