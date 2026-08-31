'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useDragControls } from 'motion/react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, ArrowRight, Plus } from '@phosphor-icons/react'
import { SiteDetailPanel } from '@/components/site-detail-panel'
import { DesignCard, type Design } from '@/components/design-card'
import { Spinner } from '@/components/ui/spinner'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import { RequestSiteDialog } from '@/components/request-site-dialog'
import { EASE, DUR } from '@/lib/motion'
import Link from 'next/link'

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

export function Gallery({ initialDesigns, initialPagination, initialCategories }: GalleryProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // The URL is the source of truth for every filter, so views are shareable
  // and the back button steps through them.
  const industries = useMemo(() => searchParams.getAll('category'), [searchParams])
  const tags = useMemo(() => searchParams.getAll('tag'), [searchParams])
  const search = searchParams.get('q') ?? ''
  const sortBy = SLUG_TO_SORT.get(searchParams.get('sort') ?? '') ?? 'recent'
  const selectedId = searchParams.get('site')

  const [designs, setDesigns] = useState<Design[]>(initialDesigns)
  const [pagination, setPagination] = useState<Pagination>(initialPagination)
  const [categories, setCategories] = useState(initialCategories)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isRefetching, setIsRefetching] = useState(false)
  const [searchInput, setSearchInput] = useState(search)
  const [requestOpen, setRequestOpen] = useState(false)

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
    industries.forEach(i => params.append('industry', i))
    tags.forEach(t => params.append('tag', t))
    if (search) params.append('search', search)
    params.append('sortBy', sortBy)
    params.append('limit', String(LIMIT))
    params.append('offset', String(offset))
    return params
  }, [industries, tags, search, sortBy])

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
      if (seq === requestSeq.current && !append) setDesigns([])
    }
  }, [buildQuery])

  // Refetch when filters change. The first render already has server data,
  // so this skips until something actually moves.
  const filterKey = `${industries.join(',')}|${tags.join(',')}|${search}|${sortBy}`
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey

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

  // Infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination.hasMore && !isLoadingMore && !isRefetching) {
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

  const selectDesign = useCallback((design: Design | null) => {
    updateParams(p => {
      if (design) p.set('site', design.id)
      else p.delete('site')
    })
  }, [updateParams])

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

  const handleFilterChange = useCallback((industry: string) => {
    sounds.playFilterClick()
    updateParams(p => {
      p.delete('site')
      p.delete('category')
      p.delete('tag')
      p.delete('q')
      if (industry === 'All') {
        return
      }
      p.set('category', industry)
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

  const hasFilters = industries.length > 0 || tags.length > 0 || search.length > 0
  const showSkeletons = isRefetching && designs.length === 0
  const galleryHeading =
    !hasFilters ? 'All sites' :
    industries.length === 1 && tags.length === 0 && !search ? industries[0] :
    search && industries.length === 0 && tags.length === 0 ? 'Search results' :
    'Filtered sites'

  // Two column tracks, because the grid gets the whole row back whenever no
  // panel is open. Each step is placed where the card would otherwise fall
  // under ~290px, the width below which titles start wrapping and the row
  // heights go ragged.
  // The panel holds its column whether or not a site is selected, so the grid
  // has the same room either way and the count does not shift under you.
  const cardColumns = 'grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3'

  const detailPanel = isPanelOpen && (
    <SiteDetailPanel
      sourceId={Number(selectedId)}
      metadata={selectedDesign ? {
        tags: selectedDesign.tags,
        designStyle: selectedDesign.designStyle,
        complexity: selectedDesign.complexity,
        useCase: selectedDesign.useCase,
        industry: selectedDesign.industry,
      } : undefined}
      onClose={() => selectDesign(null)}
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
        <div className="h-14 px-5 xl:px-7 flex items-center gap-4">

          <h1 className="text-[15px] font-semibold tracking-[-0.04em] text-foreground select-none shrink-0">
            Hitman<span className="font-light opacity-50">&apos;s</span> Library
          </h1>

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

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Deliberately in the same quiet register as Changelog rather
                than styled as a call to action. The loud version of this
                belongs in the zero-results state, where it is an answer to
                something the person just asked for. */}
            <button
              onClick={() => setRequestOpen(true)}
              className="relative hidden sm:flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              <Plus className="w-3 h-3" weight="bold" />
              Request a site
            </button>

            <Link
              href="/about"
              className="relative hidden sm:flex items-center text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              About
            </Link>

            <Link
              href="/changelog"
              // 17px tall as drawn. The overlay carries the touch target so the
              // link keeps its weight in the header.
              className="relative hidden sm:flex items-center text-meta text-ink-3 hover:text-ink transition-colors mr-1 after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 after:content-['']"
            >
              Changelog
            </Link>

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

      {/* Body — the 3-pane split waits for xl. Below it, phones and tablets
          share one layout: a tablet gets the mobile treatment with more room,
          not the desktop one squeezed into it. At lg the panes technically fit
          but leave the grid half the window, which meant 222px cards — narrower
          than the phone gets. The three tracks are fixed: the panel is part of
          the layout, not something the grid borrows while you are not looking. */}
      <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className="hidden xl:flex xl:col-span-2 flex-col sticky top-14 h-[calc(100vh-56px)] border-r border-edge-strong bg-background overflow-y-auto">
          <nav className="flex-1 py-5 px-2.5" aria-label="Category filters">
            <p className="px-2.5 pb-2.5 text-micro text-ink-4 select-none">Library</p>

            {/* space-y-px rather than 0.5: once rows fill when selected, the gap
                between them is reading as part of the shape, and 4px of it made
                the list look like stacked buttons instead of one column. */}
            <ul className="space-y-px" role="list">
              <li>
                <button
                  onClick={() => handleFilterChange('All')}
                  aria-pressed={industries.length === 0}
                  className={sidebarRow(industries.length === 0)}
                >
                  <span className="flex-1 text-left text-bodytext">All</span>
                  <span className={sidebarCount(industries.length === 0)}>{libraryTotal}</span>
                </button>
              </li>
              {categories.map(({ name, count }) => {
                const isActive = industries.includes(name)
                return (
                  <li key={name}>
                    <button
                      onClick={() => handleFilterChange(name)}
                      aria-pressed={isActive}
                      className={sidebarRow(isActive)}
                    >
                      <span className="flex-1 text-left truncate text-bodytext">{name}</span>
                      <span className={sidebarCount(isActive)}>{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* Active tags live in the filter bar above the grid, alongside
                categories and search, rather than in a second list here. */}
          </nav>
        </aside>

        {/* Gallery */}
        {/* tabIndex -1 so the skip link moves focus here and not just the
            scroll position; without it the next Tab returns to the header. */}
        <main id="gallery" tabIndex={-1} className="xl:col-span-6 flex flex-col min-w-0 focus:outline-none">
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
            </div>

            {/* Categories */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar" role="group" aria-label="Filter by category">
              {[{ name: 'All', count: libraryTotal }, ...categories].map(({ name, count }) => {
                const isActive = name === 'All' ? industries.length === 0 : industries.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => handleFilterChange(name)}
                    aria-pressed={isActive}
                    className={categoryPill(isActive)}
                  >
                    {name} <span className="tabular-nums text-ink-4">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Sort — kept on its own row so it can't be mistaken for a category */}
            <div className="flex items-center gap-2 px-4 pb-3">
              <span className="text-micro text-ink-4 shrink-0">Sort</span>
              {/* overflow-x-auto also clips vertically, which would cut the
                  buttons' touch overlays off. The padding gives them room and
                  the negative margin gives the space back to the layout. */}
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-3 -my-3" role="group" aria-label="Sort sites">
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

          <div className="flex-1 p-5 xl:p-6">
            <div className="hidden xl:flex items-center justify-between gap-4 pb-3 mb-5 border-b border-edge">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="text-meta text-ink font-medium">
                  {galleryHeading}{' '}
                  <span className="text-ink-4 tabular-nums">{pagination.total}</span>
                </h2>
                {hasFilters && (
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

            {/* Height is held during a swap so the page doesn't collapse and
                rebound between result sets. */}
            <motion.div
              className={`grid ${cardColumns} gap-4 xl:gap-5`}
              variants={gridVariants}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="show"
              aria-busy={isRefetching}
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

        <RequestSiteDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        initialUrl={search.trim()}
        onOpenSite={selectDesignById}
      />

      {/* Detail panel — the column is always here. The empty state names
            what the panel holds, which is how you learn the tabs exist. */}
        <div className="hidden xl:flex xl:col-span-4 flex-col sticky top-14 h-[calc(100vh-56px)] border-l border-edge-strong bg-background">
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
                {detailPanel}
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
                {detailPanel}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
