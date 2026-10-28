// components/site-detail-panel.tsx
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { SquaresFour, Check, BookmarkSimple, Heart, X } from '@phosphor-icons/react'
import { useCollections, toggleMembership, sanitizeName } from '@/lib/collections'
import { SIMILAR_ENABLED } from '@/lib/drift'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { HistoryTab } from './history-tab'
import { ThemeExport } from './theme-export'
import { DRIFT_ENABLED } from '@/lib/drift'
import { UNSORTED } from '@/lib/categories'
import { Spinner } from './ui/spinner'
import { EASE, DUR } from '@/lib/motion'
import type { Design } from './design-card'
import { fetchDetail, getCachedDetail } from '@/lib/detail-cache'
import posthog from 'posthog-js'
interface ColorRow { hex_value: string; oklch: string | null; area_share: number | null }
interface TypographyRow { font_family: string; role: string; google_fonts_url: string | null; primary_weight: number | null; sample_size_px?: number | null; sample_line_height?: string | null }

interface DetailData {
  id: number
  url: string
  /** The site's own name, which is what the header leads with. */
  title?: string | null
  favorite_count?: number
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  /** False for sites the proxy can never render — see PreviewTab. */
  live_preview?: boolean
  extraction_error: string | null
  colors: ColorRow[]
  typography: TypographyRow[]
}

interface SiteMetadata {
  tags?: string[]
  designStyle?: string
  complexity?: string
  useCase?: string
  kind?: string
}

interface SiteDetailPanelProps {
  /** Which breakpoint this instance is mounted at. */
  variant?: 'desktop' | 'mobile'
  sourceId: number
  metadata?: SiteMetadata
  /** The card this panel opened from, when the grid had it loaded. The panel
   *  paints from it on the same frame and lets the API fill in the rest. */
  initialDesign?: Design | null
  onClose?: () => void
  onSimilar?: () => void
  /** Tab from ?tab= — deep links restore the exact tab, not just the site. */
  initialTab?: PanelTab
  onTabChange?: (tab: PanelTab) => void
}

export function SiteDetailPanel({ variant = 'desktop', sourceId, metadata, initialDesign, onClose, onSimilar, initialTab = 'preview', onTabChange }: SiteDetailPanelProps) {
  const isMobile = variant === 'mobile'
  const [activeTab, setActiveTab] = useState<PanelTab>(initialTab)
  const [saveOpen, setSaveOpen] = useState(false)
  const [newSetName, setNewSetName] = useState('')
  const [collections] = useCollections()
  const saveRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!saveOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSaveOpen(false)
    }
    function onPointer(e: PointerEvent) {
      if (saveRef.current && !saveRef.current.contains(e.target as Node)) setSaveOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [saveOpen])
  // The panel paints from the card on the opening frame and upgrades in place
  // when the API row lands — `server` is the full row, `data` is what we have
  // right now. Fields only the server knows (favorite count, mobile capture,
  // measured swatch shares) stay hidden until then rather than flashing zeros.
  const [server, setServer] = useState<DetailData | null>(null)
  const [failed, setFailed] = useState(false)
  const loadSeq = useRef(0)
  const { playPanelOpen, playClose } = useSoundsContext()

  useEffect(() => {
    playPanelOpen()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const provisional = useMemo<DetailData | null>(() => {
    if (!initialDesign) return null
    return {
      id: Number(initialDesign.id),
      url: initialDesign.url,
      title: initialDesign.title,
      screenshot_url: initialDesign.thumbnail_url ?? null,
      mobile_screenshot_url: null,
      live_preview: true,
      extraction_error: null,
      colors: initialDesign.colors.map(hex => ({ hex_value: hex, oklch: null, area_share: null })),
      typography: initialDesign.typography.map((family, i) => ({
        font_family: family,
        role: (['heading', 'body', 'mono'] as const)[i] ?? 'body',
        google_fonts_url: null,
        primary_weight: null,
      })),
    }
  }, [initialDesign])

  const data = server ?? provisional

  const normalize = (raw: any): DetailData => ({
    ...raw,
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    typography: Array.isArray(raw.typography) ? raw.typography : [],
  })

  const load = useCallback(() => {
    const seq = ++loadSeq.current
    setFailed(false)
    setServer(null)
    // The last fetch for this site is better than a spinner while the fresh
    // row is on the wire — favorites and counts update when it lands.
    const cached = getCachedDetail(sourceId)
    if (cached && !cached.error) setServer(normalize(cached))
    fetchDetail(sourceId)
      .then(raw => {
        if (seq !== loadSeq.current) return
        if (!raw || raw.error) { setFailed(true); return }
        setServer(normalize(raw))
      })
      .catch(() => { if (seq === loadSeq.current) setFailed(true) })
  }, [sourceId])

  useEffect(() => {
    setActiveTab(initialTab)
    load()
  }, [load, initialTab])

  const hostname = (() => {
    try { return data?.url ? new URL(data.url).hostname.replace('www.', '') : '…' } catch { return data?.url ?? '…' }
  })()

  // A shared phone link can name the Mobile tab, which this variant does not
  // offer. Preview already renders the phone layout here, so it stands in.
  const effectiveTab: PanelTab = isMobile && activeTab === 'mobile' ? 'preview' : activeTab

  // The header is the site's name, its standing, and one line of filing.
  // Anything more about the row belongs in a tab.
  const kindLabel = metadata?.kind && metadata.kind !== UNSORTED ? metadata.kind : undefined
  const title = data?.title?.trim() || hostname
  const favCount = server?.favorite_count

  function updateCollectionMembership(name: string, wasSaved: boolean) {
    posthog.capture('collection_membership_updated', {
      source_id: sourceId,
      is_saved: !wasSaved,
    })
    toggleMembership(name, sourceId)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-3 border-b border-edge-faint flex-shrink-0"
        // Only bites when the panel runs edge to edge on a phone; elsewhere
        // env() is 0 and this is the same 12px the padding already was.
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-titletext text-ink truncate">{title}</p>
            {typeof favCount === 'number' && (
              <span
                className="inline-flex items-center gap-1 shrink-0 text-[12px] text-ink-4 tabular-nums"
                title={`${favCount} favorite${favCount === 1 ? '' : 's'}`}
              >
                <Heart className="w-3 h-3 text-[var(--color-error)]" weight="fill" aria-hidden="true" />
                {favCount}
                <span className="sr-only">favorites</span>
              </span>
            )}
          </div>
          {kindLabel && (
            <p className="text-micro text-ink-4 mt-1 truncate">{kindLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {SIMILAR_ENABLED && onSimilar && (
            <button
              onClick={onSimilar}
              aria-label="Show similar sites"
              title="Show similar sites"
              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
            >
              <SquaresFour className="w-4 h-4" weight="bold" />
            </button>
          )}
          <div ref={saveRef} className="relative">
            <button
              onClick={() => setSaveOpen(v => !v)}
              aria-expanded={saveOpen}
              aria-label="Save to a collection"
              title="Save to a collection"
              className="w-8 h-8 flex items-center justify-center rounded-[4px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
            >
              <BookmarkSimple className="w-4 h-4" weight={Object.values(collections).some(ids => ids.includes(sourceId)) ? 'fill' : 'bold'} />
            </button>
            {saveOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[220px] rounded-[10px] border border-edge-strong bg-card shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] p-1.5">
                {Object.keys(collections).length === 0 && (
                  <p className="px-2 py-1.5 text-meta text-ink-4">No sets yet — name one below.</p>
                )}
                {Object.entries(collections).map(([name, ids]) => {
                  const saved = ids.includes(sourceId)
                  return (
                    <button
                      key={name}
                      onClick={() => updateCollectionMembership(name, saved)}
                      aria-pressed={saved}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-[6px] text-left hover:bg-muted transition-colors"
                    >
                      <span className="flex-1 truncate text-bodytext text-ink">{name}</span>
                      <span className="text-micro tabular-nums text-ink-4">{ids.length}</span>
                      {saved && <Check className="w-3 h-3 text-ink-2" weight="bold" />}
                    </button>
                  )
                })}
                <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-edge-faint">
                  <input
                    value={newSetName}
                    onChange={e => setNewSetName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const clean = sanitizeName(newSetName)
                        if (clean) {
                          updateCollectionMembership(clean, false)
                          setNewSetName('')
                        }
                      }
                    }}
                    placeholder="New set…"
                    aria-label="New collection name"
                    className="min-w-0 flex-1 h-8 px-2 text-meta bg-muted/60 border border-edge rounded-[6px] text-foreground placeholder:text-ink-4 focus:outline-none focus:border-foreground/30 transition-colors"
                  />
                  <button
                    onClick={() => {
                      const clean = sanitizeName(newSetName)
                      if (clean) {
                        updateCollectionMembership(clean, false)
                        setNewSetName('')
                      }
                    }}
                    className="shrink-0 h-8 px-2.5 rounded-[6px] bg-foreground text-background text-meta font-medium hover:opacity-90 transition-opacity"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          <span aria-hidden="true" className="panel-head-divider w-px h-4 bg-edge mx-0.5" />
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
        <PanelTabs
          active={effectiveTab}
          onChange={tab => { setActiveTab(tab); onTabChange?.(tab) }}
          variant={variant}
          colorsCount={data?.colors.length}
          typeCount={data?.typography.length}
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {data ? (
          <motion.div
            key={`data-${sourceId}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.move, ease: EASE }}
            className="flex flex-col flex-1 min-h-0"
          >
            <AnimatePresence mode="wait">
              {effectiveTab === 'preview' && (
                <motion.div key="preview" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <PreviewTab
                    siteUrl={data.url}
                    screenshotUrl={data.screenshot_url}
                    mobileScreenshotUrl={data.mobile_screenshot_url}
                    extractionError={data.extraction_error}
                    livePreview={data.live_preview !== false}
                    displayMode={isMobile ? 'mobile' : 'live'}
                    fill={isMobile}
                  />
                </motion.div>
              )}
              {!isMobile && activeTab === 'mobile' && (
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
              {effectiveTab === 'colors' && (
                <motion.div key="colors" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <ColorsTab colors={data.colors} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {effectiveTab === 'type' && (
                <motion.div key="type" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <TypeTab typography={data.typography} extractionError={data.extraction_error} />
                </motion.div>
              )}
              {DRIFT_ENABLED && effectiveTab === 'history' && (
                <motion.div key="history" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <HistoryTab siteId={sourceId} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : failed ? (
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
        ) : (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center flex-1"
          >
            <Spinner />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token kit footer: copy the site's theme out. Persistent across tabs;
          it only needs the palette and type the panel already holds. */}
      {data && (
        <div className="flex-shrink-0 border-t border-edge-faint px-4 py-2 flex items-center justify-between gap-2">
          <span className="text-micro text-ink-4 max-[359px]:hidden">Copy theme</span>
          <ThemeExport
            siteUrl={data.url}
            siteTitle={hostname}
            colors={data.colors}
            typography={data.typography}
          />
        </div>
      )}
    </div>
  )
}
