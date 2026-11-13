'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo, Fragment } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, ArrowRight, Plus, DotsThree, BookmarkSimple } from '@phosphor-icons/react'
import dynamic from 'next/dynamic'
import { DesignCard, type Design } from '@/components/design-card'
import { ViewSwitcher, type LibraryView } from '@/components/view-switcher'
import { IndexView } from '@/components/index-view'
import { getLenis } from '@/lib/smooth-scroll'
import { SIMILAR_ENABLED } from '@/lib/drift'
import { UNSORTED, displayKind } from '@/lib/categories'
import { FILTER_TAGS } from '@/lib/tagging'
import { TasteSignup } from '@/components/taste-signup'
import { useCollections, deleteCollection } from '@/lib/collections'
import { FAVORITES_EVENT } from '@/lib/account-client'
import { AccountButton } from '@/components/account-button'
import { SavedMenu, OPEN_SAVED_EVENT } from '@/components/saved-menu'
import { EnvelopeSimple } from '@phosphor-icons/react'
import type { PanelTab } from '@/components/panel-tabs'
import { HISTORY_TAB_ENABLED } from '@/components/panel-tabs'
import { Spinner } from '@/components/ui/spinner'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { BrowsePanel } from '@/components/browse-panel'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { EASE, DUR, MENU } from '@/lib/motion'
import Link from 'next/link'
import { useIsNarrow, useIsPhone } from '@/lib/use-is-narrow'
import { useUrlParams } from '@/lib/use-url-params'
import { Refine } from '@/components/refine'
import { CARD, BTN, INPUT } from '@/components/member-card'
import { refineFromParams, refineToParams, refineApiQuery, refineActive, type RefineQuery } from '@/lib/search/refine-params'
import { openSignIn } from '@/lib/account-client'
import { prefetchDetail } from '@/lib/detail-cache'
import { track } from '@/lib/analytics'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

type SortBy = 'recent' | 'oldest' | 'name' | 'quality'

const LIMIT = 32

const SORT_OPTIONS: { value: SortBy; label: string; slug: string }[] = [
  { value: 'recent', label: 'New', slug: 'new' },
  { value: 'oldest', label: 'Old', slug: 'old' },
  { value: 'name', label: 'A–Z', slug: 'az' },
]

const SLUG_TO_SORT = new Map(SORT_OPTIONS.map(o => [o.slug, o.value]))
const SORT_TO_SLUG = new Map(SORT_OPTIONS.map(o => [o.value, o.slug]))

/**
 * The panel carries the preview, the palette math and every tab. None of it is
 * part of the first paint, so it waits for the first card to be opened instead
 * of riding along in the gallery bundle.
 */
const SiteDetailPanel = dynamic(
  () => import('@/components/site-detail-panel').then(m => m.SiteDetailPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    ),
  },
)

interface Pagination {
  total: number
  hasMore: boolean
  offset: number
}

interface GalleryProps {
  initialDesigns: Design[]
  initialPagination: Pagination
  initialCategories: { name: string; count: number }[]
  initialSimilar: { site: Design | null; neighbors: Design[] } | null
  initialParams: Record<string, string | string[] | undefined>
  /** The ?color= the server already ranked this first paint around. */
  initialColor?: string | null
}

// Local regex rather than lib/color-distance's — that import would drag
// culori into the gallery bundle, and the ranking is loaded on demand.
const COLOR_FILTER_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

// Direction H keeps active rows obvious through fill, not a leading rule.
function sortButton(isActive: boolean): string {
  return [
    'relative rounded-[10px] text-meta border transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] active:scale-[0.98]',
    // The pill is 23px tall; the overlay reaches full height.
    // Nothing sits above or below it inside the 56px header.
    "after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']",
    isActive
      ? 'bg-muted text-ink border-edge-strong'
      : 'text-ink-4 border-transparent bg-transparent hover:text-ink-3 hover:bg-foreground/[0.055]',
  ].join(' ')
}

function categoryPill(isActive: boolean): string {
  return [
    'shrink-0 h-8 px-3 rounded-[10px] text-meta whitespace-nowrap border',
    'transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] active:scale-[0.98]',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20',
    isActive
      ? 'bg-muted text-ink border-transparent font-medium hover:bg-foreground/[0.09]'
      : 'bg-foreground/[0.055] text-ink-2 border-transparent hover:text-ink hover:bg-foreground/[0.09]',
  ].join(' ')
}

// Drawn at 36px, which is comfortable with a mouse and small under a thumb.
// The overlay takes the target to 44 tall and 42 wide — 42 rather than 44
// because the buttons sit 6px apart, and a 44th pixel would reach into the
// neighbour and steal its edge.
const ICON_BUTTON =
  'relative w-9 h-9 flex items-center justify-center rounded-[10px] border border-transparent bg-muted/60 ' +
  'text-ink-3 hover:text-ink hover:bg-muted active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] ' +
  "after:absolute after:left-1/2 after:top-1/2 after:h-11 after:w-[42px] after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']"

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-edge rounded-[12px] overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-muted" />
      <div className="px-3.5 pt-2.5 pb-3 flex flex-col gap-2 border-t border-edge-faint">
        <div className="space-y-1.5">
          <div className="h-[13px] bg-muted rounded-[4px] w-3/4" />
          <div className="h-[11px] bg-muted rounded-[4px] w-1/2" />
        </div>
        <div className="flex gap-[3px]">
          {[0, 1, 2, 3].map(i => <div key={i} className="w-4 h-4 rounded-full bg-muted" />)}
        </div>
      </div>
    </div>
  )
}

export function Gallery({ initialDesigns, initialPagination, initialCategories, initialSimilar, initialParams, initialColor }: GalleryProps) {
  // The URL is the source of truth for every filter, so views are shareable
  // and the back button steps through them. It is written through the history
  // API, not the router: this page is force-dynamic, so a router.push would
  // re-run every gallery query server-side before React even moves.
  const { params: searchParams, push: pushParams, replace: replaceParams } = useUrlParams(initialParams)

  const kinds = useMemo(() => searchParams.getAll('category'), [searchParams])
  const tags = useMemo(() => searchParams.getAll('tag'), [searchParams])
  const search = searchParams.get('q') ?? ''
  const sortBy = SLUG_TO_SORT.get(searchParams.get('sort') ?? '') ?? 'recent'
  const selectedId = searchParams.get('site')
  // Deep-link tab (A1): ?site=415&tab=colors restores the exact tab.
  const rawTab = searchParams.get('tab')
  const panelTab: PanelTab = (
    rawTab === 'mobile' || rawTab === 'colors' || rawTab === 'type' || rawTab === 'kit' ||
    (rawTab === 'history' && HISTORY_TAB_ENABLED) || rawTab === 'preview'
  ) ? rawTab : 'preview'
  // Similar mode (Phase 2): the main pane shows one site's neighbors with
  // the site pinned first, instead of the filter grid. Lives in the URL so
  // any neighbor view is shareable and the back button steps out of it.
  const similarTo = searchParams.get('similarTo')
  const similarToId = SIMILAR_ENABLED && similarTo && Number.isFinite(Number(similarTo)) ? similarTo : null
  // The overview is a view, not a filter: it keeps its own URL so it can be
  // shared and stepped out of with the back button.
  const view: LibraryView = searchParams.get('view') === 'index' ? 'index' : 'grid'
  // A color view owns the grid the way similar and collection modes do:
  // everything is ranked by palette proximity, nothing else filters.
  const rawColor = searchParams.get('color') ?? ''
  const colorFilter = COLOR_FILTER_RE.test(rawColor) ? rawColor.toLowerCase() : null
  // The color trail (?trail=e90865,dce700): the journey of swatches that led
  // to the current color view, oldest first. Every hop pushes a history
  // entry, so the back button steps the journey one swatch at a time, and
  // tapping a chip rewinds to it.
  const TRAIL_MAX = 5
  const trailFilter = useMemo(() => {
    if (!colorFilter) return []
    return (searchParams.get('trail') ?? '')
      .split(',').map(s => s.trim().replace(/^#/, '')).filter(s => s)
      .filter(s => COLOR_FILTER_RE.test('#' + s))
      .slice(0, TRAIL_MAX)
      .map(s => '#' + s.toLowerCase())
  }, [searchParams, colorFilter])

  const [similarTitle, setSimilarTitle] = useState<string | null>(
    initialSimilar && similarToId && initialSimilar.site ? initialSimilar.site.title : null,
  )
  const [similarLoading, setSimilarLoading] = useState(false)

  const [designs, setDesigns] = useState<Design[]>(initialDesigns)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [categories, setCategories] = useState(initialCategories)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [searchInput, setSearchInput] = useState(search)
  const [browseOpen, setBrowseOpen] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const digestRef = useRef<HTMLDivElement>(null)
  const moreRef = useRef<HTMLDivElement>(null)

  // Dismiss the digest popover on outside click or Escape. One effect for
  // both, torn down with the popover.
  useEffect(() => {
    if (!digestOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDigestOpen(false)
    }
    function onPointer(e: PointerEvent) {
      if (digestRef.current && !digestRef.current.contains(e.target as Node)) setDigestOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [digestOpen])

  // Same dismissal contract for the phone's folded actions.
  useEffect(() => {
    if (!moreOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false)
    }
    function onPointer(e: PointerEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
    }
  }, [moreOpen])
  // Hearts feed the digest signup only: ids persist in localStorage and the
  // taste vector is recomputed server-side on every subscribe. No view, no
  // route — the Mobbin-style Save without the collection machinery.
  // Read after mount, never during render: the server renders without them,
  // and hydration keeps the server's empty hearts unless state changes.
  const [favorites, setFavorites] = useState<number[]>([])
  const [favoritesRead, setFavoritesRead] = useState(false)
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const n = Number(id)
      const next = prev.includes(n) ? prev.filter(f => f !== n) : [...prev, n]
      try {
        window.localStorage.setItem('hl:favorites', JSON.stringify(next))
      } catch { /* storage unavailable */ }
      queueMicrotask(() => window.dispatchEvent(new CustomEvent(FAVORITES_EVENT)))
      return next
    })
  }, [])
  // Hearts load once mounted, and again when a sign-in merges the account's in.
  useEffect(() => {
    const reload = () => {
      try {
        const parsed: unknown = JSON.parse(window.localStorage.getItem('hl:favorites') ?? '[]')
        if (Array.isArray(parsed)) setFavorites(parsed.map(Number).filter(Number.isFinite))
      } catch { /* storage unavailable */ }
      setFavoritesRead(true)
    }
    reload()
    window.addEventListener(FAVORITES_EVENT, reload)
    return () => window.removeEventListener(FAVORITES_EVENT, reload)
  }, [])


  const [minGridHeight, setMinGridHeight] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const isThemeTransitioning = useRef(false)
  const hasAnimated = useRef(false)
  const requestSeq = useRef(0)

  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const sounds = useSoundsContext()

  const selectedDesign = useMemo(
    () => designs.find(d => d.id === selectedId) ?? null,
    [designs, selectedId],
  )

  // A shared ?site= link may point at a site outside the loaded page. The panel
  // fetches its own detail by id, so it opens regardless; the card metadata is
  // layered on only when we happen to have it. Index has no panel of its own.
  const isPanelOpen = view === 'grid' && Boolean(selectedId) && Number.isFinite(Number(selectedId))

  // pagination.total is how many match the current filters, so it cannot label
  // the "All" row — that would read "All 13" while Finance is selected. The
  // category counts are unfiltered, so their sum is the size of the library.
  const libraryTotal = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  )

  useEffect(() => { hasAnimated.current = true; setMounted(true) }, [])

  // The panel chunk is the one part of opening a site that has to download.
  // Fetch it while the page is idle so the first open mounts instantly. The
  // import is the same one dynamic() above loads on demand, so it fills the
  // same chunk cache (next/dynamic no longer exposes a preload()).
  useEffect(() => {
    const warm = () => { import('@/components/site-detail-panel').catch(() => {}) }
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(warm, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }
    const t = setTimeout(warm, 1200)
    return () => clearTimeout(t)
  }, [])

  /** Rewrites the query string; every filter interaction goes through here. */
  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void, opts: { replace?: boolean } = {}) => {
      if (opts.replace) replaceParams(mutate)
      else pushParams(mutate)
    },
    [pushParams, replaceParams],
  )

  // Keep the input in step when the URL changes from outside (back/forward).
  useEffect(() => { setSearchInput(search) }, [search])

  // Debounce typing into the URL rather than firing a request per keystroke.
  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => {
      updateParams(p => {
        // Typing a query is a request for results, so it leaves the overview.
        p.delete('view')
        if (searchInput) p.set('q', searchInput)
        else p.delete('q')
        p.delete('site')
        p.delete('color')
        p.delete('trail')
      }, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [searchInput, search, updateParams])

  const buildQuery = useCallback((offset: number) => {
    const params = new URLSearchParams()
    kinds.forEach(k => params.append('kind', k))
    tags.forEach(t => params.append('tag', t))
    if (search) params.append('search', search)
    params.append('sortBy', sortBy)
    params.append('limit', String(LIMIT))
    params.append('offset', String(offset))
    return params
  }, [kinds, tags, search, sortBy])

  const loadDesigns = useCallback(async (offset: number, append: boolean) => {
    const seq = ++requestSeq.current
    try {
      const data = await fetch('/api/design/filter-advanced?' + buildQuery(offset)).then(r => r.json())
      // A slower earlier request must not overwrite a newer one.
      if (seq !== requestSeq.current) return
      const incoming: Design[] = data.designs || []
      setDesigns(prev => (append ? [...prev, ...incoming] : incoming))
      setPagination({
        total: data.pagination?.total ?? incoming.length,
        hasMore: data.pagination?.hasMore ?? false,
        offset: data.pagination?.offset ?? offset,
      })
    } catch {
      // A failed refetch changes nothing: wiping thirty-two rendered cards
      // on a network hiccup is how "All sites 0" happened. The stale grid
      // and its count stand until a request succeeds.
    }
  }, [buildQuery])

  // Refetch when filters change. The first render already has server data,
  // so this skips until something actually moves.
  const filterKey = `${kinds.join(',')}|${tags.join(',')}|${search}|${sortBy}`
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    // Similar and collection modes own the grid; filter edits apply when
    // they are cleared.
    if (similarToId || collectionName || refineKey) return

    // Navigation is scroll:false so opening a site doesn't jump the page, but a
    // new filter is a new result set — staying halfway down it reads as though
    // nothing changed.
    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    }

    // Pin the current height so the outgoing and incoming sets can crossfade
    // without the page collapsing and rebounding underneath them.
    const height = gridRef.current?.offsetHeight ?? 0
    if (height > 0) setMinGridHeight(height)

    setIsRefetching(true)
    loadDesigns(0, false).finally(() => {
      setIsRefetching(false)
      // Release after the new cards have painted.
      requestAnimationFrame(() => requestAnimationFrame(() => setMinGridHeight(null)))
    })
  }, [filterKey, loadDesigns])

  // Similar mode fetch (Phase 2). The first paint is server-rendered;
  // this takes over on navigation — back/forward and the panel's Similar
  // action. Leaving similar mode restores the filter grid.
  const similarSeq = useRef(0)
  const showingSimilar = useRef<boolean>(Boolean(initialSimilar && similarToId))
  const lastSimilarTo = useRef<string | null>(similarToId)
  useEffect(() => {
    if (lastSimilarTo.current === similarToId) return
    lastSimilarTo.current = similarToId
    if (!similarToId) {
      if (!showingSimilar.current) return
      showingSimilar.current = false
      setSimilarTitle(null)
      // A color view owns the grid; leaving similar for it must not fetch the
      // plain page over the top of the ranking about to land.
      if (colorRef.current) return
      setIsRefetching(true)
      loadDesigns(0, false).finally(() => setIsRefetching(false))
      return
    }
    showingSimilar.current = true
    setSimilarLoading(true)
    const seq = ++similarSeq.current
    fetch(`/api/design/${similarToId}/similar?k=24`).then(r => r.json()).then(raw => {
      if (seq !== similarSeq.current) return
      const site = raw.site
      const neighbors: Design[] = raw.neighbors || []
      if (!site) { setDesigns([]); setSimilarTitle(null); return }
      setSimilarTitle(site.title || site.url)
      setDesigns([site, ...neighbors])
      setPagination({ total: neighbors.length + 1, hasMore: false, offset: 0 })
    }).catch(() => {
      if (seq === similarSeq.current) { setDesigns([]); setSimilarTitle(null) }
    }).finally(() => {
      if (seq === similarSeq.current) setSimilarLoading(false)
    })
  }, [similarToId, loadDesigns])

  // Color view (?color=#hex): every palette in the library is ranked by how
  // close it sits to the target in OKLCH. The first paint ships server-ranked
  // (initialColor); back/forward between color views ranks client-side over a
  // full-library fetch. Ranked by proximity, so paging and sorting step aside.
  const colorRef = useRef<string | null>(colorFilter)
  colorRef.current = colorFilter
  const showingColor = useRef(Boolean(initialColor))
  const colorSeq = useRef(0)
  const lastColor = useRef<string | null>(initialColor ?? null)

  const fetchAllDesigns = useCallback(async (): Promise<Design[]> => {
    const seen = new Map<string, Design>()
    let offset = 0
    for (let page = 0; page < 4; page++) {
      const params = new URLSearchParams()
      params.append('sortBy', 'recent')
      params.append('limit', '100')
      params.append('offset', String(offset))
      const data = await fetch('/api/design/filter-advanced?' + params).then(r => r.json())
      const batch: Design[] = data.designs || []
      for (const d of batch) seen.set(d.id, d)
      if (!batch.length || !data.pagination?.hasMore) break
      offset += batch.length
    }
    return [...seen.values()]
  }, [])

  useEffect(() => {
    if (lastColor.current === colorFilter) return
    lastColor.current = colorFilter
    if (!colorFilter) {
      if (!showingColor.current) return
      showingColor.current = false
      setIsRefetching(true)
      loadDesigns(0, false).finally(() => setIsRefetching(false))
      return
    }
    showingColor.current = true
    const seq = ++colorSeq.current
    setIsRefetching(true)
    if (window.scrollY > 0) {
      window.scrollTo({
        top: 0,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      })
    }
    const height = gridRef.current?.offsetHeight ?? 0
    if (height > 0) setMinGridHeight(height)
    ;(async () => {
      try {
        // Culori rides in here so the main bundle never pays for it.
        const { rankDesignsByColor, COLOR_RADIUS, COLOR_CAP } = await import('@/lib/color-distance')
        const all = await fetchAllDesigns()
        if (seq !== colorSeq.current) return
        const ranked = rankDesignsByColor(all, colorFilter, COLOR_RADIUS, COLOR_CAP)
        setDesigns(ranked)
        setPagination({ total: ranked.length, hasMore: false, offset: 0 })
      } catch {
        if (seq !== colorSeq.current) return
        setDesigns([])
        setPagination({ total: 0, hasMore: false, offset: 0 })
      } finally {
        if (seq === colorSeq.current) setIsRefetching(false)
        requestAnimationFrame(() => requestAnimationFrame(() => setMinGridHeight(null)))
      }
    })()
  }, [colorFilter, loadDesigns, fetchAllDesigns])

  // Collection view (?collection=name): ids resolve client-side from the
  // named set, rows come from the same ids filter as favorites did. An empty
  // or foreign set renders the honest empty state, never someone else's grid.
  // ?saved=hearts shows your hearts the same way, newest first.
  const rawCollection = searchParams.get('collection')
  const heartsView = !rawCollection && searchParams.get('saved') === 'hearts'
  const collectionName = rawCollection ?? (heartsView ? 'Hearts' : null)
  const [collections] = useCollections()
  const collectionIds = heartsView ? [...favorites].reverse() : collectionName ? (collections[collectionName] ?? []) : []
  const [collectionTitle, setCollectionTitle] = useState<string | null>(null)
  const showingCollection = useRef(false)
  const collectionSeq = useRef(0)
  const lastCollection = useRef<string | null>(null)
  useEffect(() => {
    // Hearts come from this device after mount; wait for them rather than
    // flashing the empty state.
    if (heartsView && !favoritesRead) return
    const key = collectionName ? `${collectionName}:${collectionIds.join(',')}` : null
    if (lastCollection.current === key) return
    lastCollection.current = key
    if (!collectionName) {
      if (!showingCollection.current) return
      showingCollection.current = false
      setCollectionTitle(null)
      if (colorRef.current) return
      setIsRefetching(true)
      loadDesigns(0, false).finally(() => setIsRefetching(false))
      return
    }
    showingCollection.current = true
    setCollectionTitle(collectionName)
    if (collectionIds.length === 0) {
      setDesigns([])
      setPagination({ total: 0, hasMore: false, offset: 0 })
      return
    }
    setIsRefetching(true)
    const seq = ++collectionSeq.current
    fetch(`/api/design/filter-advanced?ids=${collectionIds.join(',')}&limit=200`).then(r => r.json()).then(data => {
      if (seq !== collectionSeq.current) return
      setDesigns(data.designs || [])
      setPagination({ total: data.pagination?.total ?? 0, hasMore: false, offset: 0 })
    }).catch(() => {
      if (seq === collectionSeq.current) setDesigns([])
    }).finally(() => {
      if (seq === collectionSeq.current) setIsRefetching(false)
    })
  }, [collectionName, collectionIds.join(','), loadDesigns, heartsView, favoritesRead])

  // Refine (Pro search): the server ranks the library and decides who may
  // search; the grid loads the ranked ids through the cached path, in order.
  const refine = useMemo(() => refineFromParams(searchParams), [searchParams])
  const refineKey = refineActive(refine) ? refineApiQuery(refine) : null
  const [refineNote, setRefineNote] = useState<null | 'signed-out' | 'pro' | 'failed'>(null)
  const lastRefine = useRef<string | null>(null)
  const refineSeq = useRef(0)
  useEffect(() => {
    if (lastRefine.current === refineKey) return
    const was = lastRefine.current
    lastRefine.current = refineKey
    if (!refineKey) {
      setRefineNote(null)
      if (was && !collectionName && !colorRef.current) { setIsRefetching(true); loadDesigns(0, false).finally(() => setIsRefetching(false)) }
      return
    }
    const seq = ++refineSeq.current
    setIsRefetching(true); setRefineNote(null)
    const empty = () => { setDesigns([]); setPagination({ total: 0, hasMore: false, offset: 0 }) }
    ;(async () => {
      try {
        const r = await fetch('/api/search/pro?' + refineKey, { credentials: 'same-origin' })
        if (seq !== refineSeq.current) return
        if (r.status === 401 || r.status === 402) { setRefineNote(r.status === 401 ? 'signed-out' : 'pro'); empty(); return }
        if (!r.ok) throw new Error(String(r.status))
        const { ids } = await r.json() as { ids: number[] }
        if (!ids.length) { empty(); return }
        const data = await fetch(`/api/design/filter-advanced?ids=${ids.join(',')}&limit=200`).then(res => res.json())
        if (seq !== refineSeq.current) return
        const rank = new Map(ids.map((id, i) => [String(id), i]))
        const list: Design[] = [...(data.designs || [])].sort((a: Design, b: Design) => (rank.get(String(a.id)) ?? 0) - (rank.get(String(b.id)) ?? 0))
        setDesigns(list)
        setPagination({ total: list.length, hasMore: false, offset: 0 })
        track('pro_search_used', { facets: [refine.palette.length && 'palette', refine.font && 'font', refine.readable && 'contrast'].filter(Boolean) })
      } catch {
        if (seq === refineSeq.current) { setRefineNote('failed'); empty() }
      } finally {
        if (seq === refineSeq.current) setIsRefetching(false)
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refineKey, loadDesigns])
  const applyRefine = useCallback((q: RefineQuery) => {
    updateParams(p => { p.delete('site'); p.delete('tab'); p.delete('collection'); p.delete('saved'); refineToParams(q, p) })
  }, [updateParams])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination.hasMore && !isLoadingMore && !isRefetching && !showingSimilar.current && !showingCollection.current && !showingColor.current) {
          setIsLoadingMore(true)
          loadDesigns(pagination.offset + LIMIT, true).finally(() => setIsLoadingMore(false))
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [pagination.hasMore, pagination.offset, isLoadingMore, isRefetching, loadDesigns])

  /** Open the panel for an id we may not have a loaded card for. */
  const selectDesignById = useCallback((id: string) => {
    updateParams(p => p.set('site', id))
  }, [updateParams])

  // Nothing opens itself. A cold load lands on the grid at every width and a
  // site opens on a tap or from an explicit ?site= link — selecting the first
  // card rewrote the URL on load, so a reload (or the same link on a phone)
  // kept reopening a panel nobody asked for.
  const selectDesign = useCallback((design: Design | null) => {
    updateParams(p => {
      if (design) p.set('site', design.id)
      else {
        p.delete('site')
        p.delete('tab')
      }
    })
  }, [updateParams])

  const isNarrow = useIsNarrow()
  const isPhone = useIsPhone()

  // Lock the page under anything modal: the sheet below the 3-pane split and
  // the browse layer. Lenis has to be told as well — an overflow rule stops
  // the native scrollbar but not a wheel it has already claimed.
  useEffect(() => {
    const lock = browseOpen || (isPanelOpen && window.matchMedia('(max-width: 1279px)').matches)
    const lenis = getLenis()
    if (lock) lenis?.stop()
    else lenis?.start()
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => {
      getLenis()?.start()
      document.body.style.overflow = ''
    }
  }, [isPanelOpen, browseOpen])

  // Escape closes the panel at any breakpoint; the focus trap only runs where
  // the sheet does, since that is where the panel is genuinely modal.
  useEffect(() => {
    if (!isPanelOpen) return

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') { selectDesign(null); return }
      if (e.key !== 'Tab') return
      const sheet = sheetRef.current
      if (!sheet || !sheet.offsetParent) return // hidden on desktop — don't trap
      const els = Array.from(sheet.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])'
      ))
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus() }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isPanelOpen, selectDesign])

  // ⌘K (Ctrl+K off a Mac) opens the browse layer anywhere. "/" does the same
  // unless something is being typed into — a slash in a search field is a
  // slash, not a command. Both toggle, so the same keystroke closes it.
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setBrowseOpen(v => !v)
        return
      }
      if (e.key !== '/') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return
      e.preventDefault()
      setBrowseOpen(true)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleCardClick = useCallback((design: Design) => {
    sounds.playSelect()
    track('design_opened', { source_id: design.id, opening_surface: 'gallery' })
    selectDesign(design)
  }, [sounds, selectDesign])

  // A swatch anywhere — card dot or panel color row — lands here. Color is a
  // mode, not an extra filter: it owns the grid and steps on every other
  // filter, the way similar and collection views do.
  // Inside a color view each click is a hop: the color left behind joins the
  // trail, and revisiting a color already on it rewinds the journey to that
  // point instead of appending. The same swatch twice is a no-op.
  const handleColorClick = useCallback((hex: string) => {
    const target = hex.toLowerCase()
    const currentRaw = searchParams.get('color') ?? ''
    const current = COLOR_FILTER_RE.test(currentRaw) ? currentRaw.toLowerCase() : null
    if (current === target) return
    sounds.playFilterClick()
    track('color_filter_applied', { color: hex })
    updateParams(p => {
      p.delete('site')
      p.delete('tab')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('sort')
      p.delete('collection'); p.delete('saved')
      p.delete('similarTo')
      p.delete('view')
      if (!current) {
        // First hop: the journey starts here, with nothing behind it.
        p.delete('trail')
      } else {
        const trail = (p.get('trail') ?? '').split(',').map(s => s.trim().replace(/^#/, '')).filter(s => s)
        const at = trail.findIndex(t => t.toLowerCase() === target.replace(/^#/, ''))
        if (at > -1) {
          const rewind = trail.slice(0, at)
          if (rewind.length) p.set('trail', rewind.join(','))
          else p.delete('trail')
        } else {
          p.set('trail', [...trail, current.replace(/^#/, '')].slice(-TRAIL_MAX).join(','))
        }
      }
      p.set('color', hex)
    })
  }, [sounds, updateParams, searchParams])

  const handleFilterChange = useCallback((kind: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('site')
      p.delete('tab')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('collection'); p.delete('saved')
      p.delete('similarTo')
      p.delete('color')
      p.delete('trail')
      if (kind === 'All') {
        return
      }
      p.set('category', kind)
    })
  }, [sounds, updateParams])

  const handleTagClick = useCallback((tag: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('site')
      p.delete('tab')
      p.delete('color')
      p.delete('trail')
      const current = p.getAll('tag')
      p.delete('tag')
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
      next.forEach(t => p.append('tag', t))
    })
  }, [sounds, updateParams])

  const setSort = useCallback((value: SortBy) => {
    updateParams(p => {
      const slug = SORT_TO_SLUG.get(value)
      if (!slug || value === 'recent') p.delete('sort')
      else p.set('sort', slug)
    }, { replace: true })
  }, [updateParams])

  const clearAll = useCallback(() => {
    updateParams(p => {
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('site')
      p.delete('tab')
      p.delete('sort')
      p.delete('collection'); p.delete('saved')
      p.delete('similarTo')
      p.delete('color')
      p.delete('trail')
    })
  }, [updateParams])

  const scrollToTop = useCallback(() => {
    const lenis = getLenis()
    if (lenis) lenis.scrollTo(0, { immediate: true })
    else window.scrollTo({ top: 0 })
  }, [])

  const setView = useCallback((next: LibraryView) => {
    sounds.playFilterClick()
    updateParams(p => {
      if (next === 'index') {
        // The overview is not a place a site is open; carrying ?site= into it
        // and back out would reopen a panel nobody asked for.
        p.set('view', 'index')
        p.delete('site')
        p.delete('tab')
        p.delete('similarTo')
        p.delete('color')
        p.delete('trail')
      } else {
        p.delete('view')
      }
    })
    scrollToTop()
  }, [sounds, updateParams, scrollToTop])

  // Everything in the overview lands somewhere concrete: a filter result or a
  // site, never a second overview.
  const handleIndexKind = useCallback((kind: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('view')
      p.delete('site')
      p.delete('tab')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('collection'); p.delete('saved')
      p.delete('similarTo')
      p.delete('color')
      p.delete('trail')
      if (kind !== 'All') p.set('category', kind)
    })
  }, [sounds, updateParams])

  const handleIndexSet = useCallback((name: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('view')
      p.delete('site')
      p.delete('tab')
      p.delete('similarTo')
      p.delete('color')
      p.delete('trail')
      p.set('collection', name)
    })
  }, [sounds, updateParams])

  const handleIndexTag = useCallback((tag: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('view')
      p.delete('site')
      p.delete('tab')
      p.delete('color')
      p.delete('trail')
      const current = p.getAll('tag')
      p.delete('tag')
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
      next.forEach(t => p.append('tag', t))
    })
  }, [sounds, updateParams])

  const handleIndexOpen = useCallback((design: Design) => {
    sounds.playSelect()
    track('design_opened', { source_id: design.id, opening_surface: 'index' })
    updateParams(p => {
      p.delete('view')
      p.set('site', design.id)
    })
  }, [sounds, updateParams])

  // The browse layer is an index of the whole library, not of the current
  // filter, so every choice leaves the filter state behind — the same
  // contract the sidebar had.
  const handleBrowseKind = useCallback((kind: string) => {
    setBrowseOpen(false)
    handleIndexKind(kind)
  }, [handleIndexKind])

  const handleBrowseSet = useCallback((name: string) => {
    setBrowseOpen(false)
    handleIndexSet(name)
  }, [handleIndexSet])

  const handleBrowseOpen = useCallback((id: string) => {
    sounds.playSelect()
    track('design_opened', { source_id: id, opening_surface: 'browse_panel' })
    updateParams(p => {
      p.delete('view')
      p.delete('collection'); p.delete('saved')
      p.delete('similarTo')
      p.delete('color')
      p.delete('trail')
      p.set('site', id)
    })
  }, [sounds, updateParams])

  const handleBrowseRequest = useCallback((query: string) => {
    setBrowseOpen(false)
    window.location.assign(`/submit?url=${encodeURIComponent(query)}`)
  }, [])

  const hasFilters = kinds.length > 0 || tags.length > 0 || search.length > 0 || Boolean(colorFilter)
  const showSkeletons = isRefetching && designs.length === 0
  const galleryHeading = colorFilter
    ? `Near ${colorFilter}`
    : !hasFilters ? 'All sites' :
    kinds.length === 1 && tags.length === 0 && !search ? displayKind(kinds[0]) :
    search && kinds.length === 0 && tags.length === 0 ? 'Search results' :
    'Filtered sites'
  // Phones have no chip row, so a filtered grid names what it is showing and
  // offers the way back. Search has its own field and count above.
  const phoneFilterLabel = colorFilter
    ? `Near ${colorFilter}`
    : kinds.length > 0 ? kinds.map(displayKind).join(' · ') :
    tags.length > 0 ? tags.join(' · ') :
    ''

  // Two column tracks, because the grid gets the whole row back whenever no
  // panel is open. Each step is placed where the card would otherwise fall
  // under ~290px, the width below which titles start wrapping and the row
  // heights go ragged.
  // The panel holds its column whether or not a site is selected, so the grid
  // has the same room either way and the count does not shift under you.
  // Three columns at 1440 and four at 1920 come from .gallery-grid in
  // globals.css — Tailwind's arbitrary-variant ordering proved
  // nondeterministic for overlapping same-property queries, so the wide
  // breakpoints live in plain CSS.
  const cardColumns = 'grid-cols-1 sm:grid-cols-2 gallery-grid'

  // The browse layer ranks the biggest shelf first, like the overview does.
  const browseKinds = useMemo(
    () => [...categories].sort((a, b) => b.count - a.count),
    [categories],
  )
  const recentDesigns = useMemo(() => designs.slice(0, 6), [designs])

  // Only the panel the viewport actually shows is mounted. Rendering both and
  // hiding one in CSS meant two live previews per site, and the invisible one
  // could take the visible one down with it.
  const renderDetailPanel = (variant: 'desktop' | 'mobile') =>
    isPanelOpen && (
    <SiteDetailPanel
      variant={variant}
      sourceId={Number(selectedId)}
      // The card already holds the header, the capture and the palette the
      // panel paints — it opens on those while the API fills in the rest.
      initialDesign={selectedDesign}
      metadata={selectedDesign ? {
        tags: selectedDesign.tags,
        designStyle: selectedDesign.designStyle,
        complexity: selectedDesign.complexity,
        useCase: selectedDesign.useCase,
        kind: selectedDesign.kind,
      } : undefined}
      onClose={() => selectDesign(null)}
      onFindColor={handleColorClick}
      initialTab={panelTab}
      onTabChange={tab => updateParams(p => {
        if (tab === 'preview') p.delete('tab')
        else p.set('tab', tab)
      }, { replace: true })}
    />
  )

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* The grid is up to 128 cards deep with two stops each, so tabbing past
          the header and nine categories to reach it is a long trip. */}
      <a
        href="#gallery"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-[10px] focus:border focus:border-edge-strong focus:bg-background focus:text-bodytext focus:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
      >
        Skip to sites
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-edge-strong bg-background/95 backdrop-blur-sm">
        {/* px-5 at every width keeps the mark, the search trigger and the
            actions on one 20px line. */}
        <div className="relative h-14 px-5 flex items-center gap-4">

          {/* The wordmark used to be this page's h1. With only the mark on
              screen the heading still has to exist for anything that reads
              structure rather than pixels. */}
          <h1 className="sr-only">Hitman&apos;s Library</h1>
          <Brand />

          {/* Search is a layer, not a field: the same keystroke that opens it
              searches the whole library, not just the page on screen. Below xl
              the filter block above the grid owns search, where a thumb is. */}
          <button
            onClick={() => setBrowseOpen(true)}
            aria-label="Search the library"
            aria-keyshortcuts="Meta+K"
            className="flex-1 max-w-xs h-8 pl-3 pr-1.5 hidden xl:flex items-center gap-2 rounded-[10px] border border-edge-strong text-[13px] text-ink-4 hover:border-foreground/30 hover:text-ink-2 transition-colors"
          >
            <MagnifyingGlass className="w-3 h-3 shrink-0" weight="regular" />
            <span className="flex-1 text-left truncate">Search sites…</span>
            <kbd className={CARD.kbd + ' pointer-events-none'}>
              ⌘K
            </kbd>
          </button>
          <Refine value={refine} onApply={applyRefine} className="hidden xl:block" />

          {/* On a phone the switcher sits on the window's centre line, the way
              the prototype does, rather than in whatever space the mark and
              the actions happen to leave. From sm it joins the row. */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:static sm:translate-x-0 sm:translate-y-0 sm:flex-1 xl:flex-none">
            <ViewSwitcher view={view} onChange={setView} />
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Deliberately in the same quiet register as Changelog rather
                than styled as a call to action. The loud version of this
                belongs in the zero-results state, where it is an answer to
                something the person just asked for. */}
            <button
              onClick={() => setDigestOpen(v => !v)}
              aria-expanded={digestOpen}
              aria-label="Weekly digest"
              title="Weekly digest"
              className="relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 max-sm:hidden after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <EnvelopeSimple className="w-3.5 h-3.5" weight="bold" />
              <span>Digest</span>
            </button>
            {/* Submit sits in the same quiet register as Digest — the loud
                version belongs in the zero-results state, where it is an
                answer to something the person just asked for. */}
            <Link
              href="/submit"
              aria-label="Submit your work"
              className="relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 max-sm:hidden after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <Plus className="w-3 h-3" weight="bold" />
              <span>Submit</span>
            </Link>
            <SavedMenu />
            <AccountButton />

            <button
              onClick={() => {
                if (!sounds.enabled) sounds.playThemeToggle(true)
                sounds.setEnabled(p => !p)
              }}
              className={ICON_BUTTON + ' max-sm:hidden'}
              aria-label={sounds.enabled ? 'Mute sounds' : 'Enable sounds'}
              aria-pressed={sounds.enabled}
            >
              {sounds.enabled ? <SpeakerHigh className="w-4 h-4" weight="regular" /> : <SpeakerSlash className="w-4 h-4" weight="regular" />}
            </button>

            <button
              onClick={(e) => {
                if (isThemeTransitioning.current) return
                sounds.playThemeToggle()
                const next = resolvedTheme === 'dark' ? 'light' : 'dark'
                const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                if (!document.startViewTransition || reduced) { setTheme(next); return }
                isThemeTransitioning.current = true
                const { clientX: x, clientY: y } = e
                const endRadius = Math.hypot(
                  Math.max(x, window.innerWidth - x),
                  Math.max(y, window.innerHeight - y),
                )
                const t = document.startViewTransition(() => setTheme(next))
                t.ready.then(() => {
                  document.documentElement.animate(
                    { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
                    { duration: 360, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
                  )
                })
                t.finished.then(() => { isThemeTransitioning.current = false })
              }}
              className={ICON_BUTTON}
              aria-label={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <motion.span key={mounted ? resolvedTheme : 'ssr'} initial={{ rotate: -20, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} style={{ display: 'flex' }}>
                {mounted && resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" weight="regular" /> : <Moon className="w-3.5 h-3.5" weight="regular" />}
              </motion.span>
            </button>

            {/* On a phone the three secondary actions fold in here so the
                view switcher has the middle of the bar to itself. */}
            <div ref={moreRef} className="relative sm:hidden">
              <button
                onClick={() => setMoreOpen(v => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="menu"
                aria-label="More"
                title="More"
                className={ICON_BUTTON}
              >
                <DotsThree className="w-4 h-4" weight="bold" />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    key="more-menu"
                    role="menu"
                    {...MENU}
                    style={{ transformOrigin: 'top right' }}
                    className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[208px] rounded-[10px] border border-edge-strong bg-card p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
                  >
                  <button
                    role="menuitem"
                    // Opened a tick later, so this tap doesn't count as a click outside it.
                    onClick={() => { setMoreOpen(false); setTimeout(() => window.dispatchEvent(new Event(OPEN_SAVED_EVENT)), 0) }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    <BookmarkSimple className="w-4 h-4" weight="bold" />
                    <span>Saved</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); setDigestOpen(true) }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    <EnvelopeSimple className="w-4 h-4" weight="bold" />
                    <span>Digest</span>
                  </button>
                  <Link
                    role="menuitem"
                    href="/submit"
                    onClick={() => setMoreOpen(false)}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Submit</span>
                  </Link>
                  <button
                    role="menuitemcheckbox"
                    aria-checked={sounds.enabled}
                    onClick={() => {
                      if (!sounds.enabled) sounds.playThemeToggle(true)
                      sounds.setEnabled(p => !p)
                    }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[10px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    {sounds.enabled
                      ? <SpeakerHigh className="w-4 h-4" weight="regular" />
                      : <SpeakerSlash className="w-4 h-4" weight="regular" />}
                    <span>{sounds.enabled ? 'Mute sounds' : 'Enable sounds'}</span>
                  </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {digestOpen && (
          <motion.div
            key="digest-popover"
            ref={digestRef}
            {...MENU}
            style={{ transformOrigin: 'top right' }}
            className={CARD.shell + ' fixed z-[60] top-14 right-4 left-4 sm:left-auto sm:w-[340px] shadow-[0_24px_56px_-20px_rgba(0,0,0,0.35)]'}
          >
            <div className={CARD.head}>
              <span>Weekly digest</span>
              <button
                onClick={() => setDigestOpen(false)}
                aria-label="Close digest signup"
                className={BTN.icon + ' -mr-2'}
              >
                <X className="w-3.5 h-3.5" weight="bold" />
              </button>
            </div>
            <TasteSignup />
            <div className={CARD.foot + ' px-4'}>
              <span className={CARD.meta}>Unsubscribe any time.</span>
              <button onClick={() => setDigestOpen(false)} className={CARD.footBtn + ' ml-auto -mr-2'}>Close <span className={CARD.kbd}>esc</span></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {view === 'index' ? (
        /* The overview owns the whole width. It repeats what the sidebar and
           the sheet would say anyway, so the 3-pane shell steps aside. */
        <main id="gallery" tabIndex={-1} className="min-h-[calc(100vh-56px)] focus:outline-none">
          <IndexView
            total={libraryTotal}
            categories={categories}
            collections={collections}
            designs={designs}
            favorites={favorites}
            activeTags={tags}
            onKind={handleIndexKind}
            onOpenSet={handleIndexSet}
            onOpenDesign={handleIndexOpen}
            onTag={handleIndexTag}
          />
        </main>
      ) : (
      /* Body — the 3-pane split waits for xl. Below it, phones and tablets
          share one layout: a tablet gets the mobile treatment with more room,
          not the desktop one squeezed into it. Two tracks: the grid takes
          everything the panel does not, and the panel is part of the layout
          rather than something the grid borrows. */
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[calc(100vh-56px)]">

        {/* Gallery */}
        {/* tabIndex -1 so the skip link moves focus here and not just the
            scroll position; without it the next Tab returns to the header. */}
        <main id="gallery" tabIndex={-1} className="xl:col-span-8 min-[1920px]:col-span-9 flex flex-col min-w-0 focus:outline-none">
          {/* Compact filters — mobile and tablet */}
          <div className="xl:hidden sticky top-14 z-20 bg-background border-b border-edge-strong">
            <div className="px-4 pt-3 pb-2 flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-ink-3 pointer-events-none" weight="regular" />
              <input
                type="search"
                placeholder="Search sites…"
                aria-label="Search sites"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className={INPUT + ' pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden'}
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
              {!searchInput && search && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-micro tabular-nums text-ink-4 pointer-events-none" aria-hidden="true">
                  {pagination.total}
                </span>
              )}
            </div>
            <Refine value={refine} onApply={applyRefine} />
            </div>

            <p className="px-4 pt-1 pb-2 text-meta text-ink-4 text-balance">
              {libraryTotal} of the web&apos;s best-designed sites, dissected.
            </p>

            {/* Categories and tags are the tablet's chip surface. On a phone
                the overview already owns kinds, tags and sets, so the grid
                keeps only search and a way out of whatever filter it arrived
                with. */}
            <div className="hidden sm:block">
              {/* Categories */}
              <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar" role="group" aria-label="Filter by kind of site">
                {[{ name: 'All', count: libraryTotal }, ...categories].map(({ name, count }) => {
                  const isActive = name === 'All' ? kinds.length === 0 : kinds.includes(name)
                  return (
                    <button
                      key={name}
                      onClick={() => handleFilterChange(name)}
                      aria-pressed={isActive}
                      className={categoryPill(isActive)}
                    >
                      {name === 'All' ? name : displayKind(name)} <span className="tabular-nums text-ink-4">{count}</span>
                    </button>
                  )
                })}
              </div>

              {/* Tags and sort share one row: three stacked control rows read
                  as clutter beside the categories above them. */}
              <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto no-scrollbar">
                <div className="flex gap-2 shrink-0" role="group" aria-label="Filter by tag">
                  {FILTER_TAGS.map(t => {
                    const isActive = tags.includes(t)
                    return (
                      <button
                        key={t}
                        onClick={() => handleTagClick(t)}
                        aria-pressed={isActive}
                        className={categoryPill(isActive)}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {!colorFilter && <span aria-hidden="true" className="shrink-0 w-px self-stretch bg-edge" />}
                {/* overflow-x-auto clips vertically, which would cut the sort
                    buttons' touch overlays off — same compensation as before,
                    scoped to the sort group now. Ranking owns the order in a
                    color view, so the sort group steps aside. */}
                {!colorFilter && (
                <div className="flex items-center gap-1.5 shrink-0 py-3 -my-3" role="group" aria-label="Sort sites">
                  <span className="text-micro text-ink-4 shrink-0">Sort</span>
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSort(value)}
                      aria-pressed={sortBy === value}
                      className={`shrink-0 px-1.5 py-0.5 ${sortButton(sortBy === value)}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                )}
              </div>
            </div>

            {phoneFilterLabel && (
              <div className="sm:hidden flex items-center gap-2 px-4 pb-3 text-meta text-ink-4">
                <span className="text-ink-2 truncate">{phoneFilterLabel}</span>
                <span className="tabular-nums shrink-0">{pagination.total}</span>
                <button
                  onClick={clearAll}
                  className="ml-auto shrink-0 text-ink-3 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A] rounded-[5px]"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* pb-20 below xl clears the floating page links, which are centred
              over the last row on phones and tablets. */}
          <div className="flex-1 p-5 xl:p-6 max-xl:pb-20">
            {/* The color trail: the swatches that led here, oldest first.
                Tapping one rewinds the journey; the back button steps it. */}
            {trailFilter.length > 0 && colorFilter && (
              <div role="group" className="flex items-center gap-1.5 pb-3 xl:-mt-1 overflow-x-auto no-scrollbar" aria-label="Color trail">
                {trailFilter.map((hex, i) => (
                  <Fragment key={`${hex}:${i}`}>
                    {i > 0 && <span aria-hidden="true" className="shrink-0 text-micro text-ink-4">→</span>}
                    <button
                      onClick={() => handleColorClick(hex)}
                      aria-label={`Back to ${hex}`}
                      className="shrink-0 inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-edge bg-card text-[11.5px] font-medium tracking-[0.01em] text-ink-3 hover:text-ink hover:border-edge-strong transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25"
                    >
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-full border border-black/[0.06] dark:border-white/[0.22]"
                        style={{ backgroundColor: hex }}
                      />
                      {hex}
                    </button>
                  </Fragment>
                ))}
                <span aria-hidden="true" className="shrink-0 text-micro text-ink-4">→</span>
                <span className="shrink-0 inline-flex items-center gap-1.5 h-6 pl-1.5 pr-2.5 rounded-full border border-edge-strong bg-card text-[11.5px] font-medium tracking-[0.01em] text-ink cursor-default">
                  <span
                    aria-hidden="true"
                    className="w-3 h-3 rounded-full border border-black/[0.06] dark:border-white/[0.22]"
                    style={{ backgroundColor: colorFilter }}
                  />
                  {colorFilter}
                </span>
              </div>
            )}
            {refineKey && (
              <div className="pb-3 mb-4 border-b border-edge">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[12.5px] font-[600] text-ink mr-1">Refined</span>
                  {refine.palette.length > 0 && (
                    <button onClick={() => applyRefine({ ...refine, palette: [] })} className="h-7 pl-2 pr-1.5 flex items-center gap-1.5 rounded-full bg-muted/70 text-[12px] text-ink-2 hover:bg-muted" title="Remove palette">
                      {refine.palette.map(c => <span key={c} className="w-3 h-3 rounded-[3px] ring-1 ring-inset ring-foreground/10" style={{ background: c }} />)}
                      <X className="w-3 h-3 text-ink-4" weight="bold" />
                    </button>
                  )}
                  {refine.font && (
                    <button onClick={() => applyRefine({ ...refine, font: '' })} className={BTN.chip(false) + ' gap-1.5'}>
                      Font: {refine.font} <X className="w-3 h-3 text-ink-4" weight="bold" />
                    </button>
                  )}
                  {refine.readable && (
                    <button onClick={() => applyRefine({ ...refine, readable: '' })} className={BTN.chip(false) + ' gap-1.5'}>
                      Readable {refine.readable} <X className="w-3 h-3 text-ink-4" weight="bold" />
                    </button>
                  )}
                  <button onClick={() => applyRefine({ palette: [], font: '', readable: '' })} className="ml-1 text-[12px] text-ink-4 hover:text-ink">Clear</button>
                  {!refineNote && <span className="ml-auto text-[12px] text-ink-4">{pagination.total} {pagination.total === 1 ? 'site' : 'sites'}</span>}
                </div>
                {refineNote && (
                  <p role="status" className="mt-3 text-[13.5px] text-ink-2">
                    {refineNote === 'pro' && <>Refine is part of Pro: search the whole library by palette, font and readable text. <a href="/pro" className="font-[600] underline underline-offset-4 hover:text-ink">Go Pro</a></>}
                    {refineNote === 'signed-out' && <>Refine is part of Pro. <button onClick={() => openSignIn('join')} className="font-[600] underline underline-offset-4 hover:text-ink">Sign in</button>, then <a href="/pro" className="font-[600] underline underline-offset-4 hover:text-ink">Go Pro</a>.</>}
                    {refineNote === 'failed' && <>Couldn&apos;t refine just now. Try again.</>}
                  </p>
                )}
              </div>
            )}
            {/* Below xl there is no grid heading, so a set or your hearts get
                their own: what you're looking at, and the way back. */}
            {collectionName && (
              <div className="xl:hidden flex items-center justify-between gap-3 pb-3 mb-4 border-b border-edge">
                <h2 className="min-w-0 truncate text-[13px] font-[600] tracking-[-0.01em] text-ink">
                  {collectionTitle ?? collectionName} <span className="font-[500] text-ink-4">{pagination.total}</span>
                </h2>
                <Link href="/" scroll={false} className="shrink-0 text-[12px] text-ink-4 hover:text-ink transition-colors">Back to library</Link>
              </div>
            )}
            <div className={(refineKey ? 'hidden' : 'hidden xl:flex') + ' items-center justify-between gap-4 pb-3 mb-5 border-b border-edge'}>
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="flex items-center gap-1.5 text-meta text-ink font-medium">
                  {colorFilter && (
                    <span
                      aria-hidden="true"
                      className="inline-block w-3.5 h-3.5 rounded-full border border-black/[0.06] dark:border-white/[0.22] shrink-0"
                      style={{ backgroundColor: colorFilter }}
                    />
                  )}
                  {similarToId ? `Similar to ${similarTitle ?? '…'}` : collectionName ? collectionTitle ?? collectionName : galleryHeading}{' '}
                  <span className="text-ink-4 tabular-nums">{pagination.total}</span>
                </h2>
                {(hasFilters || similarToId || collectionName) && (
                  <Link
                    href="/"
                    scroll={false}
                    className="text-meta text-ink-4 hover:text-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8A04A] rounded-[5px]"
                  >
                    Clear
                  </Link>
                )}
              </div>

              {colorFilter ? (
                // Ranking is the sort here; naming it keeps the grid honest.
                <span className="text-micro text-ink-4 shrink-0">
                  Ordered by how close each palette sits
                </span>
              ) : (
              <div
                className="flex items-center gap-0.5"
                role="group"
                aria-label="Sort sites"
              >
                <span className="text-micro text-ink-4 shrink-0 mr-0.5">Sort</span>
                {SORT_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setSort(value)}
                    aria-pressed={sortBy === value}
                    className={`shrink-0 px-1.5 py-0.5 ${sortButton(sortBy === value)}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              )}
            </div>

            {/* One line of value proposition: nothing above the fold says
                what this is, and shared-link visitors bounce on confusion. */}
            <p className={(refineKey ? 'hidden' : 'hidden xl:block') + ' text-meta text-ink-4 text-balance pb-3 -mt-2'}>
              {libraryTotal} of the web&apos;s best-designed sites, dissected. Colors, type, assets and screenshots, extracted automatically.
            </p>

                        {/* Height is held during a swap so the page doesn't collapse and
                rebound between result sets. */}
            <motion.div
              className={`grid ${cardColumns} gap-4 xl:gap-5`}
              variants={gridVariants}
              initial={false}
              animate="show"
              aria-busy={isRefetching || similarLoading}
              style={minGridHeight ? { minHeight: minGridHeight } : undefined}
              ref={gridRef}
            >
              <AnimatePresence mode="sync">
                {showSkeletons
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`s${i}`} />)
                  : designs.length === 0 && refineNote
                    // The refine note above already says what happened; nothing below it.
                    ? null
                  : designs.length === 0
                    ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <p className="text-bodytext text-ink-3">
                          {refineKey ? (refineNote ? '' : 'No sites match. Try fewer colours or a wider readable setting.') : heartsView ? 'Heart a site and it shows up here' : collectionName ? 'Nothing in this set yet' : hasFilters ? 'Nothing here yet' : 'No sites yet'}
                        </p>

                        {/* Searching and finding nothing is the moment someone
                            most wants a site added, and the search term is
                            already the thing they want. Offering it anywhere
                            else means asking them to type it twice. */}
                        {search.trim() && (
                          <>
                            <p className="text-reading text-ink-2 max-w-[280px]">
                              Want <span className="text-ink">{search.trim()}</span> in the library?
                            </p>
                            <Link
                              href={`/submit?url=${encodeURIComponent(search.trim())}`}
                              className={'mt-1 ' + BTN.primaryLg}
                            >
                              Submit it
                              <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                            </Link>
                          </>
                        )}

                        {categories.length > 0 && !refineKey && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 max-w-[320px]">
                            {categories.map(({ name }) => (
                              <button
                                key={name}
                                onClick={() => handleFilterChange(name)}
                                className={BTN.chip(false)}
                              >
                                {name === 'All' ? name : displayKind(name)}
                              </button>
                            ))}
                          </div>
                        )}
                        {hasFilters && (
                          <button
                            onClick={clearAll}
                            className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors"
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    )
                    : designs.map((design, i) => (
                      <DesignCard
                        key={design.id}
                        design={design}
                        index={i}
                        isSelected={selectedId === design.id}
                        onClick={() => handleCardClick(design)}
                        // Hover is the look before the leap: warm the detail
                        // row so the click opens on data, not a spinner.
                        onHover={() => { sounds.playHover(); prefetchDetail(design.id) }}
                        onTagClick={handleTagClick}
                        onColorClick={handleColorClick}
                        hasAnimated={hasAnimated.current}
                        isFavorite={favorites.includes(Number(design.id))}
                        onToggleFavorite={() => {
                          const isFavorited = favorites.includes(Number(design.id))
                          track('design_favorite_toggled', {
                            source_id: design.id,
                            is_favorited: !isFavorited,
                          })
                          toggleFavorite(design.id)
                        }}
                      />
                    ))
                }
              </AnimatePresence>
            </motion.div>

            <div ref={sentinelRef} className="h-1 mt-4" />
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}

            {/* Announce result counts to screen readers without a visual change */}
            <p className="sr-only" role="status" aria-live="polite">
              {isRefetching ? 'Loading sites' : `${pagination.total} sites`}
            </p>
          </div>

        </main>

      {/* Detail panel — the column is always here. The empty state names
            what the panel holds, which is how you learn the tabs exist. */}
        <div className="hidden xl:flex xl:col-span-4 track-panel flex-col sticky top-14 z-40 h-[calc(100vh-56px)] border-l border-edge-strong bg-background">
          <AnimatePresence mode="wait">
            {isPanelOpen && !isNarrow ? (
              <motion.div
                key={selectedId}
                // Switching sites is constant: the new one fades up at once,
                // the old one leaves without holding the column empty.
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0 } }}
                transition={{ duration: 0.12, ease: EASE }}
                className="flex flex-col h-full"
              >
                {renderDetailPanel('desktop')}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center h-full"
              >
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <p className="text-meta text-ink-4">Select a site</p>
                  <p className="text-micro text-ink-4">
                    preview · mobile · colors · type
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
      )}

      {/* The sheet covers this corner on a phone, so the links hide only
          there. On desktop the corner stays visible and reachable with a card
          open — hiding them there stranded About/Changelog behind the panel. */}
      <SiteLinks hidden={isPanelOpen && isNarrow} />

      <BrowsePanel
        open={browseOpen}
        onClose={() => setBrowseOpen(false)}
        total={libraryTotal}
        kinds={browseKinds}
        collections={collections}
        recents={recentDesigns}
        onKind={handleBrowseKind}
        onSet={handleBrowseSet}
        onDeleteSet={deleteCollection}
        onOpenSite={handleBrowseOpen}
        onRequest={handleBrowseRequest}
      />

      {/* The panel below the three-pane split. On a tablet it is the same
          drawer the prototype draws: a card floating 10px inside the viewport,
          not a sheet bolted to the bottom. Under 640 it becomes the page. */}
      <AnimatePresence>
        {isNarrow && isPanelOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="xl:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
              onClick={() => selectDesign(null)}
            />

            <motion.div
              key="sheet"
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site details"
              initial={{ opacity: 0, transform: 'translateX(24px)' }}
              animate={{ opacity: 1, transform: 'translateX(0px)' }}
              exit={{ opacity: 0, transform: 'translateX(24px)', transition: { duration: 0.16, ease: EASE } }}
              transition={{ type: 'spring', damping: 38, stiffness: 420, mass: 0.8 }}
              className="site-sheet xl:hidden fixed z-50 flex flex-col overflow-hidden bg-card border border-edge-strong"
              style={{
                top: 'var(--sheet-top, 10px)',
                right: 'var(--sheet-right, 10px)',
                bottom: 'var(--sheet-bottom, 10px)',
                width: 'var(--sheet-width, min(636px, calc(100vw - 20px)))',
                borderRadius: 'var(--sheet-radius, 14px)',
                boxShadow: 'var(--sheet-shadow, 0 24px 80px -20px rgba(0,0,0,0.45))',
              }}
            >
              <div className="flex flex-col flex-1 min-h-0" style={{ touchAction: 'pan-y', paddingBottom: 'var(--safe-bottom)' }}>
                {renderDetailPanel(isPhone ? 'mobile' : 'desktop')}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
