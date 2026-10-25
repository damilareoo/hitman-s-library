'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDragControls } from 'motion/react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, ArrowRight, Plus } from '@phosphor-icons/react'
import { SiteDetailPanel } from '@/components/site-detail-panel'
import { DesignCard, type Design } from '@/components/design-card'
import { SIMILAR_ENABLED } from '@/lib/drift'
import { UNSORTED, displayKind } from '@/lib/categories'
import { FILTER_TAGS } from '@/lib/tagging'
import { TasteSignup } from '@/components/taste-signup'
import { useCollections, deleteCollection } from '@/lib/collections'
import { EnvelopeSimple } from '@phosphor-icons/react'
import type { PanelTab } from '@/components/panel-tabs'
import { HISTORY_TAB_ENABLED } from '@/components/panel-tabs'
import { Spinner } from '@/components/ui/spinner'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { RequestSiteDialog } from '@/components/request-site-dialog'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { EASE, DUR } from '@/lib/motion'
import Link from 'next/link'
import { useIsNarrow } from '@/lib/use-is-narrow'

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
}

// Direction H keeps active rows obvious through fill, not a leading rule.
function sidebarRow(isActive: boolean): string {
  return [
    'group w-full flex items-center gap-2 rounded-[8px] text-bodytext px-2.5 py-[7px] border',
    'transition-[background-color,border-color,color] duration-[var(--dur-2)] ease-[var(--ease-sig)]',
    'focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20',
    isActive
      ? 'text-ink font-medium bg-muted border-transparent hover:bg-foreground/[0.09]'
      : 'text-ink-2 font-normal bg-transparent border-transparent hover:text-ink hover:bg-foreground/[0.055]',
  ].join(' ')
}

function sortButton(isActive: boolean): string {
  return [
    'relative rounded-[6px] text-meta border transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)] active:scale-[0.98]',
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
    'shrink-0 h-8 px-3 rounded-[8px] text-meta whitespace-nowrap border',
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

// Counts share a fixed column and sit right-aligned, so the digits line up down
// the list instead of ending wherever each label happens to leave them.
function sidebarCount(isActive: boolean): string {
  return [
    'text-meta tabular-nums shrink-0 w-7 text-right transition-colors',
    isActive ? 'text-ink-3' : 'text-ink-4',
  ].join(' ')
}

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-edge rounded-[4px] overflow-hidden animate-pulse">
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

/**
 * Named sets, listed where they are made. One row per set with its count;
 * opening one swaps the grid to its members. The × removes the set, never
 * a site — membership is edited from the panel's Save menu.
 */
function CollectionsSection({ onOpen, activeName }: { onOpen: (name: string) => void; activeName: string | null }) {
  const [collections] = useCollections()
  const names = Object.keys(collections)
  if (names.length === 0) return null
  return (
    <div className="px-2.5 pb-5">
      <p className="px-2.5 pb-2 text-micro text-ink-4 select-none">Sets</p>
      <ul className="space-y-1" role="list">
        {names.map(name => {
          const isActive = activeName === name
          return (
            <li key={name} className="group flex items-center gap-1">
              <button
                onClick={() => onOpen(name)}
                aria-pressed={isActive}
                className={sidebarRow(isActive) + ' flex-1 min-w-0'}
              >
                <span className="flex-1 text-left truncate text-bodytext">{name}</span>
                <span className={sidebarCount(isActive)}>{collections[name].length}</span>
              </button>
              <button
                onClick={() => deleteCollection(name)}
                aria-label={`Delete set ${name}`}
                title={`Delete set ${name}`}
                className="shrink-0 w-7 h-7 hidden group-hover:flex group-focus-within:flex items-center justify-center rounded-[4px] text-ink-4 hover:text-ink hover:bg-muted transition-colors"
              >
                <span aria-hidden="true">×</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Gallery({ initialDesigns, initialPagination, initialCategories, initialSimilar }: GalleryProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The URL is the source of truth for every filter, so views are shareable
  // and the back button steps through them.
  const kinds = useMemo(() => searchParams.getAll('category'), [searchParams])
  const tags = useMemo(() => searchParams.getAll('tag'), [searchParams])
  const search = searchParams.get('q') ?? ''
  const sortBy = SLUG_TO_SORT.get(searchParams.get('sort') ?? '') ?? 'recent'
  const selectedId = searchParams.get('site')
  // Deep-link tab (A1): ?site=415&tab=colors restores the exact tab.
  const rawTab = searchParams.get('tab')
  const panelTab: PanelTab = (
    rawTab === 'mobile' || rawTab === 'colors' || rawTab === 'type' ||
    (rawTab === 'history' && HISTORY_TAB_ENABLED) || rawTab === 'preview'
  ) ? rawTab : 'preview'
  // Similar mode (Phase 2): the main pane shows one site's neighbors with
  // the site pinned first, instead of the filter grid. Lives in the URL so
  // any neighbor view is shareable and the back button steps out of it.
  const similarTo = searchParams.get('similarTo')
  const similarToId = SIMILAR_ENABLED && similarTo && Number.isFinite(Number(similarTo)) ? similarTo : null

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
  const [requestOpen, setRequestOpen] = useState(false)
  const [digestOpen, setDigestOpen] = useState(false)
  const digestRef = useRef<HTMLDivElement>(null)

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
  // Hearts feed the digest signup only: ids persist in localStorage and the
  // taste vector is recomputed server-side on every subscribe. No view, no
  // route — the Mobbin-style Save without the collection machinery.
  const [favorites, setFavorites] = useState<number[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const raw = window.localStorage.getItem('hl:favorites')
      const parsed: unknown = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isFinite) : []
    } catch {
      return []
    }
  })
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const n = Number(id)
      const next = prev.includes(n) ? prev.filter(f => f !== n) : [...prev, n]
      try {
        window.localStorage.setItem('hl:favorites', JSON.stringify(next))
      } catch { /* storage unavailable */ }
      return next
    })
  }, [])


  const [minGridHeight, setMinGridHeight] = useState<number | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const isThemeTransitioning = useRef(false)
  const sheetDragControls = useDragControls()
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
  // layered on only when we happen to have it.
  const isPanelOpen = Boolean(selectedId) && Number.isFinite(Number(selectedId))

  // pagination.total is how many match the current filters, so it cannot label
  // the "All" row — that would read "All 13" while Finance is selected. The
  // category counts are unfiltered, so their sum is the size of the library.
  const libraryTotal = useMemo(
    () => categories.reduce((sum, c) => sum + c.count, 0),
    [categories],
  )

  useEffect(() => { hasAnimated.current = true; setMounted(true) }, [])

  // Router navigation is async, so two quick clicks would both read the same
  // useSearchParams snapshot and the second would overwrite the first — picking
  // one category dropped the other. This holds the pending query string so
  // consecutive edits compose.
  const pendingParams = useRef<string | null>(null)
  useEffect(() => { pendingParams.current = null }, [searchParams])

  /** Rewrites the query string; every filter interaction goes through here. */
  const updateParams = useCallback(
    (mutate: (p: URLSearchParams) => void, opts: { replace?: boolean } = {}) => {
      const base = pendingParams.current ?? searchParams.toString()
      const params = new URLSearchParams(base)
      mutate(params)
      const qs = params.toString()
      pendingParams.current = qs
      const url = qs ? `${pathname}?${qs}` : pathname
      if (opts.replace) router.replace(url, { scroll: false })
      else router.push(url, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  // Keep the input in step when the URL changes from outside (back/forward).
  useEffect(() => { setSearchInput(search) }, [search])

  // Debounce typing into the URL rather than firing a request per keystroke.
  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => {
      updateParams(p => {
        if (searchInput) p.set('q', searchInput)
        else p.delete('q')
        p.delete('site')
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
    if (similarToId || collectionName) return

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

  // Collection view (?collection=name): ids resolve client-side from the
  // named set, rows come from the same ids filter as favorites did. An empty
  // or foreign set renders the honest empty state, never someone else's grid.
  const collectionName = searchParams.get('collection')
  const [collections] = useCollections()
  const collectionIds = collectionName ? (collections[collectionName] ?? []) : []
  const [collectionTitle, setCollectionTitle] = useState<string | null>(null)
  const showingCollection = useRef(false)
  const collectionSeq = useRef(0)
  const lastCollection = useRef<string | null>(null)
  useEffect(() => {
    const key = collectionName ? `${collectionName}:${collectionIds.join(',')}` : null
    if (lastCollection.current === key) return
    lastCollection.current = key
    if (!collectionName) {
      if (!showingCollection.current) return
      showingCollection.current = false
      setCollectionTitle(null)
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
  }, [collectionName, collectionIds.join(','), loadDesigns])

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination.hasMore && !isLoadingMore && !isRefetching && !showingSimilar.current && !showingCollection.current) {
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

  // Explicit deselect is remembered for the session, so the cold-load
  // default-select below does not resurrect a panel the visitor closed.
  const deselected = useRef(false)
  const selectDesign = useCallback((design: Design | null) => {
    if (!design) deselected.current = true
    updateParams(p => {
      if (design) p.set('site', design.id)
      else p.delete('site')
    })
  }, [updateParams])

  // Cold loads open populated: the first card is selected so the panel
  // never greets a visitor empty. Runs once per result set, only when no
  // site is open and none was explicitly closed. Desktop only — on a phone
  // this would pop the bottom sheet on every cold load.
  useEffect(() => {
    if (selectedId || deselected.current || designs.length === 0 || isRefetching) return
    if (!window.matchMedia('(min-width: 1280px)').matches) return
    selectDesign(designs[0])
  }, [designs, selectedId, isRefetching, selectDesign])

  const isNarrow = useIsNarrow()

  // Lock body scroll only for the sheet, which runs up to the 3-pane split.
  useEffect(() => {
    if (!isPanelOpen) return
    const mobile = window.matchMedia('(max-width: 1279px)')
    if (!mobile.matches) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isPanelOpen])

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleCardClick = useCallback((design: Design) => {
    sounds.playSelect()
    selectDesign(design)
  }, [sounds, selectDesign])

  const handleFilterChange = useCallback((kind: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('site')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
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
      p.delete('sort')
    })
  }, [updateParams])

  const hasFilters = kinds.length > 0 || tags.length > 0 || search.length > 0
  const showSkeletons = isRefetching && designs.length === 0
  const galleryHeading =
    !hasFilters ? 'All sites' :
    kinds.length === 1 && tags.length === 0 && !search ? displayKind(kinds[0]) :
    search && kinds.length === 0 && tags.length === 0 ? 'Search results' :
    'Filtered sites'

  // Two column tracks, because the grid gets the whole row back whenever no
  // panel is open. Each step is placed where the card would otherwise fall
  // under ~290px, the width below which titles start wrapping and the row
  // heights go ragged.
  // The panel holds its column whether or not a site is selected, so the grid
  // has the same room either way and the count does not shift under you.
  // Three columns at 1536 and four at 1920 come from .gallery-grid in
  // globals.css — Tailwind's arbitrary-variant ordering proved
  // nondeterministic for overlapping same-property queries, so the wide
  // breakpoints live in plain CSS.
  const cardColumns = 'grid-cols-1 sm:grid-cols-2 gallery-grid'

  // Only the panel the viewport actually shows is mounted. Rendering both and
  // hiding one in CSS meant two live previews per site, and the invisible one
  // could take the visible one down with it.
  const renderDetailPanel = (variant: 'desktop' | 'mobile') =>
    isPanelOpen && (variant === 'mobile') === isNarrow && (
    <SiteDetailPanel
      variant={variant}
      sourceId={Number(selectedId)}
      metadata={selectedDesign ? {
        tags: selectedDesign.tags,
        designStyle: selectedDesign.designStyle,
        complexity: selectedDesign.complexity,
        useCase: selectedDesign.useCase,
        kind: selectedDesign.kind,
      } : undefined}
      onClose={() => selectDesign(null)}
      onSimilar={() => updateParams(p => { if (selectedId) p.set('similarTo', selectedId) })}
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
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-[4px] focus:border focus:border-edge-strong focus:bg-background focus:text-bodytext focus:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"
      >
        Skip to sites
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-edge-strong bg-background/95 backdrop-blur-sm">
        {/* px-5 at every width: the mark sits on the same 20px line as the
            sidebar's text (nav px-2.5 + label px-2.5), so logo and rail read
            as one structured edge rather than two near-misses. */}
        <div className="h-14 px-5 flex items-center gap-4">

          {/* The wordmark used to be this page's h1. With only the mark on
              screen the heading still has to exist for anything that reads
              structure rather than pixels. */}
          <h1 className="sr-only">Hitman&apos;s Library</h1>
          <Brand />

          {/* Search — the header controls belong to the 3-pane layout. Below
              it the filter block above the grid owns search and sort, and two
              live copies of each would be on screen at once. */}
          <div className="flex-1 max-w-xs hidden xl:flex items-center relative">
            <MagnifyingGlass className="absolute left-2.5 w-3 h-3 text-ink-3 pointer-events-none" weight="regular" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Search sites…"
              aria-label="Search sites"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur() }}
              className="w-full h-7 pl-7 pr-6 text-ui bg-muted/70 border border-transparent rounded-[10px] text-foreground placeholder:text-ink-4 outline-none hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-foreground/15 focus-visible:outline-none [&:focus-visible]:outline-none transition-[background-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-sig)] [&::-webkit-search-cancel-button]:hidden"
            />
            {searchInput ? (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 text-ink-4 hover:text-ink-2 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" weight="bold" />
              </button>
            ) : (
              <kbd className="absolute right-2 flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[4px] border border-edge text-micro text-ink-4 pointer-events-none">
                /
              </kbd>
            )}
          </div>
          {/* Live result count sits outside the box: inside it would collide
              with the clear button and the / hint sharing the right edge. */}
          <span className="hidden xl:block w-8 text-right text-micro tabular-nums text-ink-4 shrink-0" aria-hidden="true">
            {search ? pagination.total : ''}
          </span>

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
              className="relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 max-sm:w-9 max-sm:h-9 max-sm:justify-center max-sm:rounded-[10px] max-sm:bg-muted/60 max-sm:hover:bg-muted max-sm:active:scale-[0.98] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <EnvelopeSimple className="w-3.5 h-3.5 max-sm:w-4 max-sm:h-4" weight="bold" />
              <span className="max-sm:sr-only">Digest</span>
            </button>
            <button
              onClick={() => setRequestOpen(true)}
              aria-label="Request a site"
              className="relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 sm:mr-1 max-sm:w-9 max-sm:h-9 max-sm:justify-center max-sm:rounded-[10px] max-sm:bg-muted/60 max-sm:hover:bg-muted max-sm:active:scale-[0.98] after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <Plus className="w-3 h-3 max-sm:w-4 max-sm:h-4" weight="bold" />
              <span className="max-sm:sr-only">Request a site</span>
            </button>

            <button
              onClick={() => {
                if (!sounds.enabled) sounds.playThemeToggle(true)
                sounds.setEnabled(p => !p)
              }}
              className={ICON_BUTTON}
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
          </div>
        </div>
      </header>

      {digestOpen && (
        <div ref={digestRef} className="fixed z-[60] top-14 right-4 left-4 sm:left-auto sm:w-[320px] rounded-[10px] border border-edge-strong bg-card shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)] p-1">
          <div className="flex items-center justify-end pl-3 pr-1 py-1">
            <button
              onClick={() => setDigestOpen(false)}
              aria-label="Close digest signup"
              className="w-7 h-7 flex items-center justify-center rounded-[4px] text-ink-4 hover:text-ink hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5" weight="bold" />
            </button>
          </div>
          <TasteSignup />
        </div>
      )}

      {/* Body — the 3-pane split waits for xl. Below it, phones and tablets
          share one layout: a tablet gets the mobile treatment with more room,
          not the desktop one squeezed into it. At lg the panes technically fit
          but leave the grid half the window, which meant 222px cards — narrower
          than the phone gets. The three tracks are fixed: the panel is part of
          the layout, not something the grid borrows while you are not looking. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className="hidden xl:flex xl:col-span-2 flex-col sticky top-14 h-[calc(100vh-56px)] border-r border-edge-strong bg-background overflow-y-auto">
          <nav className="flex-1 py-5 px-2.5" aria-label="Library">
            <p className="px-2.5 pb-2.5 text-micro text-ink-4 select-none">Library</p>

            {/* A 4px gap keeps adjacent filled rows from merging visually when
                one is active and the next is hovered. */}
            <ul className="space-y-1" role="list">
              <li>
                <button
                  onClick={() => handleFilterChange('All')}
                  aria-pressed={kinds.length === 0}
                  className={sidebarRow(kinds.length === 0)}
                >
                  <span className="flex-1 text-left text-bodytext">All</span>
                  <span className={sidebarCount(kinds.length === 0)}>{libraryTotal}</span>
                </button>
              </li>
              {categories.map(({ name, count }) => {
                const isActive = kinds.includes(name)
                const label = displayKind(name)
                return (
                  <li key={name}>
                    <button
                      onClick={() => handleFilterChange(name)}
                      aria-pressed={isActive}
                      aria-label={`Filter by ${label}`}
                      title={label}
                      className={sidebarRow(isActive)}
                    >
                      <span className="flex-1 text-left truncate text-bodytext">{label}</span>
                      <span className={sidebarCount(isActive)}>{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Active tags live in the filter bar above the grid, alongside
                categories and search, rather than in a second list here. */}
          </nav>

          <CollectionsSection
            onOpen={name => updateParams(p => {
              p.delete('site')
              p.delete('similarTo')
              p.set('collection', name)
            })}
            activeName={searchParams.get('collection')}
          />

        </aside>

        {/* Gallery */}
        {/* tabIndex -1 so the skip link moves focus here and not just the
            scroll position; without it the next Tab returns to the header. */}
        <main id="gallery" tabIndex={-1} className="xl:col-span-6 min-[1920px]:col-span-7 flex flex-col min-w-0 focus:outline-none">
          {/* Compact filters — mobile and tablet */}
          <div className="xl:hidden sticky top-14 z-20 bg-background border-b border-edge-strong">
            <div className="px-4 pt-3 pb-2 relative">
              <MagnifyingGlass className="absolute left-7 top-1/2 -translate-y-[2px] w-3 h-3 text-ink-3 pointer-events-none" weight="regular" />
              <input
                type="search"
                placeholder="Search sites…"
                aria-label="Search sites"
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full h-8 pl-8 pr-7 text-ui bg-muted/70 border border-transparent rounded-[12px] text-foreground placeholder:text-ink-4 outline-none hover:bg-muted focus:bg-muted focus:ring-1 focus:ring-foreground/15 focus-visible:outline-none [&:focus-visible]:outline-none transition-[background-color,box-shadow] duration-[var(--dur-2)] ease-[var(--ease-sig)] [&::-webkit-search-cancel-button]:hidden"
              />
              {searchInput && (
                <button
                  onClick={() => setSearchInput('')}
                  className="absolute right-7 top-1/2 -translate-y-[2px] text-ink-4 hover:text-ink-2 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
              {!searchInput && search && (
                <span className="absolute right-4 top-1/2 -translate-y-[2px] text-micro tabular-nums text-ink-4 pointer-events-none" aria-hidden="true">
                  {pagination.total}
                </span>
              )}
            </div>

            <p className="px-4 pt-1 pb-2 text-meta text-ink-4 text-balance">
              {libraryTotal} of the web&apos;s best-designed sites, dissected.
            </p>

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
              <span aria-hidden="true" className="shrink-0 w-px self-stretch bg-edge" />
              {/* overflow-x-auto clips vertically, which would cut the sort
                  buttons' touch overlays off — same compensation as before,
                  scoped to the sort group now. */}
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
            </div>
          </div>

          {/* pb-20 below xl clears the floating page links, which are centred
              over the last row on phones and tablets. */}
          <div className="flex-1 p-5 xl:p-6 max-xl:pb-20">
            <div className="hidden xl:flex items-center justify-between gap-4 pb-3 mb-5 border-b border-edge">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-meta text-ink font-medium">
                  {similarToId ? `Similar to ${similarTitle ?? '…'}` : collectionName ? collectionTitle ?? collectionName : galleryHeading}{' '}
                  <span className="text-ink-4 tabular-nums">{pagination.total}</span>
                </h2>
                {(hasFilters || similarToId) && (
                  <Link
                    href={pathname}
                    scroll={false}
                    className="text-meta text-ink-4 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[4px]"
                  >
                    Clear
                  </Link>
                )}
              </div>

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
            </div>

            {/* One line of value proposition: nothing above the fold says
                what this is, and shared-link visitors bounce on confusion. */}
            <p className="hidden xl:block text-meta text-ink-4 text-balance pb-3 -mt-2">
              {libraryTotal} of the web&apos;s best-designed sites, dissected. Colors, type, assets and screenshots, extracted automatically.
            </p>

                        {/* Height is held during a swap so the page doesn't collapse and
                rebound between result sets. */}
            <motion.div
              className={`grid ${cardColumns} gap-4 xl:gap-5`}
              variants={gridVariants}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="show"
              aria-busy={isRefetching || similarLoading}
              style={minGridHeight ? { minHeight: minGridHeight } : undefined}
              ref={gridRef}
            >
              <AnimatePresence mode="sync">
                {showSkeletons
                  ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={`s${i}`} />)
                  : designs.length === 0
                    ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3 text-center">
                        <p className="text-bodytext text-ink-3">
                          {hasFilters ? 'Nothing here yet' : 'No sites yet'}
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
                            <button
                              onClick={() => setRequestOpen(true)}
                              className="mt-1 h-9 px-4 inline-flex items-center gap-2 rounded-[6px] bg-foreground text-background text-bodytext font-medium hover:opacity-90 transition-opacity"
                            >
                              Request it
                              <ArrowRight className="w-3.5 h-3.5" weight="bold" />
                            </button>
                          </>
                        )}

                        {categories.length > 0 && (
                          <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1 max-w-[320px]">
                            {categories.map(({ name }) => (
                              <button
                                key={name}
                                onClick={() => handleFilterChange(name)}
                                className="shrink-0 h-8 px-3 rounded-[8px] text-meta whitespace-nowrap border bg-foreground/[0.055] text-ink-2 border-transparent hover:text-ink hover:bg-foreground/[0.09] active:scale-[0.98] transition-[background-color,border-color,color,transform] duration-[var(--dur-2)] ease-[var(--ease-sig)]"
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
                        onHover={() => sounds.playHover()}
                        onTagClick={handleTagClick}
                        hasAnimated={hasAnimated.current}
                        isFavorite={favorites.includes(Number(design.id))}
                        onToggleFavorite={() => toggleFavorite(design.id)}
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

        {/* The sheet covers this corner on a phone, so the links hide only
            there. On desktop the sidebar corner stays visible and reachable
            with a card open — hiding them there stranded About/Changelog
            behind the panel. */}
        <SiteLinks hidden={isPanelOpen && isNarrow} variant="sidebar" />

      <RequestSiteDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        initialUrl={search.trim()}
        onOpenSite={selectDesignById}
      />

      {/* Detail panel — the column is always here. The empty state names
            what the panel holds, which is how you learn the tabs exist. */}
        <div className="hidden xl:flex xl:col-span-4 track-panel flex-col sticky top-14 h-[calc(100vh-56px)] border-l border-edge-strong bg-background">
          <AnimatePresence mode="wait">
            {isPanelOpen ? (
              <motion.div
                key={selectedId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
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

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="xl:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px]"
              onClick={() => selectDesign(null)}
            />

            <motion.div
              key="sheet"
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site details"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 36, stiffness: 380, mass: 0.7 }}
              drag="y"
              dragControls={sheetDragControls}
              dragListener={false}
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 80 || info.velocity.y > 500) selectDesign(null)
              }}
              className="xl:hidden fixed bottom-0 left-0 right-0 z-50 bg-background flex flex-col"
              style={{
                height: '82svh',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -12px 40px rgba(0,0,0,0.12)',
              }}
            >
              <div
                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={e => sheetDragControls.start(e)}
              >
                <div className="w-10 h-[5px] rounded-full bg-ink-4" />
              </div>

              <div className="flex flex-col flex-1 min-h-0" style={{ touchAction: 'pan-y', paddingBottom: 'var(--safe-bottom)' }}>
                {renderDetailPanel('mobile')}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
