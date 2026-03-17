// components/site-detail-panel.tsx
'use client'

import { useState, useEffect } from 'react'
import { PanelTabs, type PanelTab } from './panel-tabs'
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
          <button onClick={onClose} className="ml-3 flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors text-sm">
            ✕
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex-shrink-0">
        <PanelTabs active={activeTab} onChange={setActiveTab} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-4 h-4 border border-border border-t-foreground rounded-full animate-spin" />
        </div>
      ) : data ? (
        <div className="flex flex-col flex-1 min-h-0">
          {activeTab === 'preview' && <PreviewTab screenshotUrl={data.screenshot_url} siteUrl={data.url} extractionError={data.extraction_error} />}
          {activeTab === 'colors' && <ColorsTab colors={data.colors} extractionError={data.extraction_error} />}
          {activeTab === 'type' && <TypeTab typography={data.typography} extractionError={data.extraction_error} />}
          {activeTab === 'assets' && <AssetsTab assets={data.assets} extractionError={data.extraction_error} />}
        </div>
      ) : (
        <div className="flex items-center justify-center flex-1 p-8">
          <p className="text-xs text-muted-foreground">Failed to load</p>
        </div>
      )}

      {/* Footer — always visible, shared across all tabs */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3">
        <a
          href={data?.url ?? '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 w-full text-xs border border-border rounded-md py-2 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors font-mono"
        >
          ↗ Visit site
        </a>
      </div>
    </div>
  )
}
