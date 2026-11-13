// components/site-detail-panel.tsx
'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Check, BookmarkSimple, Heart, X } from '@phosphor-icons/react'
import { useCollections, toggleMembership, sanitizeName } from '@/lib/collections'
import { PanelTabs, type PanelTab } from './panel-tabs'
import { useSoundsContext } from '@/contexts/sounds-context'
import { PreviewTab } from './preview-tab'
import { ColorsTab } from './colors-tab'
import { TypeTab } from './type-tab'
import { HistoryTab } from './history-tab'
import { ThemeExport } from './theme-export'
import { KitLink } from './kit-row'
import { CARD } from '@/components/member-card'
import { KitTab } from './kit-tab'
import { DRIFT_ENABLED } from '@/lib/drift'
import { UNSORTED } from '@/lib/categories'
import { Spinner } from './ui/spinner'
import { EASE, DUR, POP_IN, POP_OUT } from '@/lib/motion'
import type { Design } from './design-card'
import { fetchDetail, getCachedDetail } from '@/lib/detail-cache'
import { useAccount, openSignIn } from '@/lib/account-client'
import { track } from '@/lib/analytics'
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
  /** A color row's find-near action: opens that color's neighborhood. */
  onFindColor?: (hex: string) => void
  /** Tab from ?tab= — deep links restore the exact tab, not just the site. */
  initialTab?: PanelTab
  onTabChange?: (tab: PanelTab) => void
}

export function SiteDetailPanel({ variant = 'desktop', sourceId, metadata, initialDesign, onClose, onFindColor, initialTab = 'preview', onTabChange }: SiteDetailPanelProps) {
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
  const [serverState, setServerState] = useState<{ id: number; data: DetailData } | null>(null)
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

  // The previous site's row must never stand in for this one, even for the
  // single frame before the effect below clears it.
  const server = serverState && serverState.id === sourceId ? serverState.data : null
  const data = server ?? provisional

  const normalize = (raw: any): DetailData => ({
    ...raw,
    colors: Array.isArray(raw.colors) ? raw.colors : [],
    typography: Array.isArray(raw.typography) ? raw.typography : [],
  })

  const load = useCallback(() => {
    const seq = ++loadSeq.current
    setFailed(false)
    setServerState(null)
    // The last fetch for this site is better than a spinner while the fresh
    // row is on the wire — favorites and counts update when it lands.
    const cached = getCachedDetail(sourceId)
    if (cached && !cached.error) setServerState({ id: sourceId, data: normalize(cached) })
    fetchDetail(sourceId)
      .then(raw => {
        if (seq !== loadSeq.current) return
        if (!raw || raw.error) { setFailed(true); return }
        setServerState({ id: sourceId, data: normalize(raw) })
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
  // "Goodside → An independent brand design studio" reads as "Goodside".
  const shortName = (() => {
    const head = title.split(/\s+[→—–|·]\s+|\s+-\s+|:\s+/)[0].trim()
    return head.length >= 2 && head.length <= 48 ? head : title
  })()
  const favCount = server?.favorite_count

  const account = useAccount()

  function updateCollectionMembership(name: string, wasSaved: boolean) {
    track('collection_membership_updated', {
      source_id: sourceId,
      is_saved: !wasSaved,
    })
    toggleMembership(name, sourceId)
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
        // Only bites when the panel runs edge to edge on a phone; elsewhere
        // env() is 0 and this is the same 12px the padding already was.
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
      >
        <div className="min-w-0 flex-1">
          {/* The site's own name, not its SEO title; the full title is on hover. */}
          <h2 className="text-[17px] font-[640] tracking-[-0.025em] leading-tight text-ink truncate" title={title}>{shortName}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-ink-4 min-w-0">
            <span className="truncate">{hostname}</span>
            {kindLabel && <><span aria-hidden="true">·</span><span className="shrink-0">{kindLabel}</span></>}
            {typeof favCount === 'number' && favCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 shrink-0" title={`${favCount} heart${favCount === 1 ? '' : 's'}`}>
                  <Heart className="w-3 h-3 text-[var(--color-error)]" weight="fill" aria-hidden="true" />
                  {favCount}<span className="sr-only"> hearts</span>
                </span>
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0 -mr-1.5">
          <div ref={saveRef} className="relative">
            <button
              onClick={() => setSaveOpen(v => !v)}
              aria-expanded={saveOpen}
              aria-label="Save to a collection"
              title="Save to a collection"
              className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
            >
              <BookmarkSimple className="w-4 h-4" weight={Object.values(collections).some(ids => ids.includes(sourceId)) ? 'fill' : 'bold'} />
            </button>
            <AnimatePresence>
              {saveOpen && (
                <motion.div
                  key="save-popover"
                  initial={{ opacity: 0, scale: 0.96, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -2, transition: POP_OUT }}
                  transition={POP_IN}
                  style={{ transformOrigin: 'top right' }}
                  className={CARD.shell + ' absolute right-0 top-[calc(100%+6px)] z-50 w-[260px] shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
                >
                <div className={CARD.head}>
                  <span>Save to a set</span>
                  {account.status === 'signed-out'
                    // Saving works without an account; this only says how to keep it everywhere.
                    ? <button onClick={() => openSignIn('join')} className="text-ink-4 hover:text-ink underline underline-offset-2">Sign in to sync</button>
                    : <span className="text-ink-4">{Object.keys(collections).length} {Object.keys(collections).length === 1 ? 'set' : 'sets'}</span>}
                </div>
                <div className="p-1.5 max-h-[260px] overflow-auto">
                  {Object.keys(collections).length === 0 && (
                    <p className={CARD.meta + ' px-2.5 py-2'}>No sets yet. Name your first one below.</p>
                  )}
                  {Object.entries(collections).map(([name, ids]) => {
                    const saved = ids.includes(sourceId)
                    return (
                      <button
                        key={name}
                        onClick={() => updateCollectionMembership(name, saved)}
                        aria-pressed={saved}
                        className="w-full h-9 px-2.5 flex items-center gap-2.5 rounded-[9px] text-left text-[13.5px] font-[500] text-ink hover:bg-foreground/[0.045] transition-colors"
                      >
                        <span className={'w-4 h-4 shrink-0 grid place-items-center rounded-[5px] border ' + (saved ? 'bg-foreground border-foreground text-background' : 'border-edge-strong')}>
                          {saved && <Check className="w-2.5 h-2.5" weight="bold" />}
                        </span>
                        <span className="flex-1 truncate">{name}</span>
                        <span className={CARD.kbd}>{ids.length}</span>
                      </button>
                    )
                  })}
                </div>
                <div className={CARD.foot + ' px-2'}>
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
                    className="min-w-0 flex-1 h-8 px-2 bg-transparent text-[13px] text-ink placeholder:text-ink-4 outline-none"
                  />
                  <button
                    onClick={() => {
                      const clean = sanitizeName(newSetName)
                      if (clean) {
                        updateCollectionMembership(clean, false)
                        setNewSetName('')
                      }
                    }}
                    disabled={!sanitizeName(newSetName)}
                    className={CARD.footBtn + ' text-ink font-[600] disabled:opacity-40'}
                  >
                    Add <span className={CARD.kbd}>↵</span>
                  </button>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {onClose && (
            <button
              onClick={() => { playClose(); onClose() }}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] text-ink-3 hover:text-ink hover:bg-muted transition-colors"
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
                  <ColorsTab colors={data.colors} extractionError={data.extraction_error} onFindColor={onFindColor} />
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
              {effectiveTab === 'kit' && (
                <motion.div key="kit" className="flex flex-col flex-1 min-h-0"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DUR.move, ease: EASE }}
                  exit={{ opacity: 0, y: -4, transition: { duration: DUR.exit } }}>
                  <KitTab siteId={data.id} siteUrl={data.url} hostname={hostname} colors={data.colors} typography={data.typography} />
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

      {/* Footer: on every tab but Kit, a line into the kit, then the free
          theme copies. The Kit tab carries its own download. */}
      {data && effectiveTab !== 'kit' && (
        <>
          <KitLink onOpen={() => { setActiveTab('kit'); onTabChange?.('kit') }} />
          <div className="flex-shrink-0 border-t border-edge-faint px-4 h-11 flex items-center justify-between gap-2">
            <span className="text-[12px] text-ink-4 max-[359px]:hidden">Copy theme</span>
            <ThemeExport
              siteUrl={data.url}
              siteTitle={hostname}
              colors={data.colors}
              typography={data.typography}
            />
          </div>
        </>
      )}
    </div>
  )
}
