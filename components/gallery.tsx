'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, ArrowRight, Plus, DotsThree } from '@phosphor-icons/react'
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
import { EnvelopeSimple } from '@phosphor-icons/react'
import type { PanelTab } from '@/components/panel-tabs'
import { HISTORY_TAB_ENABLED } from '@/components/panel-tabs'
import { Spinner } from '@/components/ui/spinner'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { RequestSiteDialog } from '@/components/request-site-dialog'
import { BrowsePanel } from '@/components/browse-panel'
import { Brand } from '@/components/brand'
import { SiteLinks } from '@/components/site-links'
import { EASE, DUR } from '@/lib/motion'
import Link from 'next/link'
import { useIsNarrow, useIsPhone } from '@/lib/use-is-narrow'
import posthog from 'posthog-js'

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
}

// Direction H keeps active rows obvious through fill, not a leading rule.
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
  // The overview is a view, not a filter: it keeps its own URL so it can be
  // shared and stepped out of with the back button.
  const view: LibraryView = searchParams.get('view') === 'index' ? 'index' : 'grid'

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
  // Opening Request from the browse panel carries the query it found nothing
  // for, so the person does not retype what they just searched.
  const [requestPrefill, setRequestPrefill] = useState('')
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
        // Typing a query is a request for results, so it leaves the overview.
        p.delete('view')
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

  // Nothing opens itself. A cold load lands on the grid at every width and a
  // site opens on a tap or from an explicit ?site= link — selecting the first
  // card rewrote the URL on load, so a reload (or the same link on a phone)
  // kept reopening a panel nobody asked for.
  const selectDesign = useCallback((design: Design | null) => {
    updateParams(p => {
      if (design) p.set('site', design.id)
      else p.delete('site')
    })
  }, [updateParams])

  const isNarrow = useIsNarrow()
  const isPhone = useIsPhone()

  // Lock the page under anything modal: the sheet below the 3-pane split, the
  // request dialog at every width, and the browse layer. Lenis has to be told
  // as well — an overflow rule stops the native scrollbar but not a wheel it
  // has already claimed.
  useEffect(() => {
    const lock = requestOpen || browseOpen || (isPanelOpen && window.matchMedia('(max-width: 1279px)').matches)
    const lenis = getLenis()
    if (lock) lenis?.stop()
    else lenis?.start()
    document.body.style.overflow = lock ? 'hidden' : ''
    return () => {
      getLenis()?.start()
      document.body.style.overflow = ''
    }
  }, [isPanelOpen, requestOpen, browseOpen])

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
    posthog.capture('design_opened', { source_id: design.id, opening_surface: 'gallery' })
    selectDesign(design)
  }, [sounds, selectDesign])

  const handleFilterChange = useCallback((kind: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('site')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('collection')
      p.delete('similarTo')
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
      p.delete('collection')
      p.delete('similarTo')
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
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      p.delete('collection')
      p.delete('similarTo')
      if (kind !== 'All') p.set('category', kind)
    })
  }, [sounds, updateParams])

  const handleIndexSet = useCallback((name: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('view')
      p.delete('site')
      p.delete('similarTo')
      p.set('collection', name)
    })
  }, [sounds, updateParams])

  const handleIndexTag = useCallback((tag: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('view')
      p.delete('site')
      const current = p.getAll('tag')
      p.delete('tag')
      const next = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
      next.forEach(t => p.append('tag', t))
    })
  }, [sounds, updateParams])

  const handleIndexOpen = useCallback((design: Design) => {
    sounds.playSelect()
    posthog.capture('design_opened', { source_id: design.id, opening_surface: 'index' })
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
    posthog.capture('design_opened', { source_id: id, opening_surface: 'browse_panel' })
    updateParams(p => {
      p.delete('view')
      p.delete('collection')
      p.delete('similarTo')
      p.set('site', id)
    })
  }, [sounds, updateParams])

  const handleBrowseRequest = useCallback((query: string) => {
    setBrowseOpen(false)
    setRequestPrefill(query)
    setRequestOpen(true)
  }, [])

  const hasFilters = kinds.length > 0 || tags.length > 0 || search.length > 0
  const showSkeletons = isRefetching && designs.length === 0
  const galleryHeading =
    !hasFilters ? 'All sites' :
    kinds.length === 1 && tags.length === 0 && !search ? displayKind(kinds[0]) :
    search && kinds.length === 0 && tags.length === 0 ? 'Search results' :
    'Filtered sites'
  // Phones have no chip row, so a filtered grid names what it is showing and
  // offers the way back. Search has its own field and count above.
  const phoneFilterLabel =
    kinds.length > 0 ? kinds.map(displayKind).join(' · ') :
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
            className="flex-1 max-w-xs h-7 pl-2.5 pr-1.5 hidden xl:flex items-center gap-2 rounded-[10px] bg-muted/70 border border-transparent text-ui text-ink-4 hover:bg-muted hover:text-ink-2 transition-[background-color,color] duration-[var(--dur-2)] ease-[var(--ease-sig)]"
          >
            <MagnifyingGlass className="w-3 h-3 shrink-0" weight="regular" />
            <span className="flex-1 text-left truncate">Search sites…</span>
            <kbd className="flex items-center justify-center h-[16px] min-w-[16px] px-1 rounded-[4px] border border-edge text-micro pointer-events-none">
              ⌘K
            </kbd>
          </button>

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
            <button
              onClick={() => setRequestOpen(true)}
              aria-label="Request a site"
              className="relative flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 max-sm:hidden after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <Plus className="w-3 h-3" weight="bold" />
              <span>Request a site</span>
            </button>

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
              {moreOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+6px)] z-[60] w-[208px] rounded-[10px] border border-edge-strong bg-card p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.28)]"
                >
                  <button
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); setDigestOpen(true) }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[6px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    <EnvelopeSimple className="w-4 h-4" weight="bold" />
                    <span>Digest</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setMoreOpen(false); setRequestOpen(true) }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[6px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" weight="bold" />
                    <span>Request a site</span>
                  </button>
                  <button
                    role="menuitemcheckbox"
                    aria-checked={sounds.enabled}
                    onClick={() => {
                      if (!sounds.enabled) sounds.playThemeToggle(true)
                      sounds.setEnabled(p => !p)
                    }}
                    className="w-full flex items-center gap-2.5 h-9 px-2.5 rounded-[6px] text-bodytext text-ink-2 text-left hover:text-ink hover:bg-muted transition-colors"
                  >
                    {sounds.enabled
                      ? <SpeakerHigh className="w-4 h-4" weight="regular" />
                      : <SpeakerSlash className="w-4 h-4" weight="regular" />}
                    <span>{sounds.enabled ? 'Mute sounds' : 'Enable sounds'}</span>
                  </button>
                </div>
              )}
            </div>
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

            {phoneFilterLabel && (
              <div className="sm:hidden flex items-center gap-2 px-4 pb-3 text-meta text-ink-4">
                <span className="text-ink-2 truncate">{phoneFilterLabel}</span>
                <span className="tabular-nums shrink-0">{pagination.total}</span>
                <button
                  onClick={clearAll}
                  className="ml-auto shrink-0 text-ink-3 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/25 rounded-[4px]"
                >
                  Clear
                </button>
              </div>
            )}
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
                        onToggleFavorite={() => {
                          const isFavorited = favorites.includes(Number(design.id))
                          posthog.capture('design_favorite_toggled', {
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
        <div className="hidden xl:flex xl:col-span-4 track-panel flex-col sticky top-14 h-[calc(100vh-56px)] border-l border-edge-strong bg-background">
          <AnimatePresence mode="wait">
            {isPanelOpen && !isNarrow ? (
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

      <RequestSiteDialog
        open={requestOpen}
        onClose={() => { setRequestOpen(false); setRequestPrefill('') }}
        initialUrl={requestPrefill || search.trim()}
        onOpenSite={selectDesignById}
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
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
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
