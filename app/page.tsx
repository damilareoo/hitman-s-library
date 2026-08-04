'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useDragControls } from 'motion/react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, Presentation } from '@phosphor-icons/react'
import { SiteDetailPanel } from '@/components/site-detail-panel'
import { PresentationMode } from '@/components/presentation-mode'
import { DesignCard, type Design } from '@/components/design-card'
import { Spinner } from '@/components/ui/spinner'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import Link from 'next/link'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
}

interface ActiveFilters {
  industries: string[]
  tags: string[]
  search: string
  sortBy: 'recent' | 'oldest' | 'name' | 'quality'
}

const LIMIT = 32

const SORT_OPTIONS: { value: ActiveFilters['sortBy']; label: string }[] = [
  { value: 'recent', label: 'New' },
  { value: 'oldest', label: 'Old' },
  { value: 'name', label: 'A–Z' },
  { value: 'quality', label: 'Top' },
]

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

export default function DesignLibrary() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [pagination, setPagination] = useState({ total: 0, hasMore: false, offset: 0 })
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)
  const [presentationIndex, setPresentationIndex] = useState<number | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const isThemeTransitioning = useRef(false)
  const sheetDragControls = useDragControls()

  const { resolvedTheme, setTheme } = useTheme()
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    industries: [],
    tags: [],
    search: '',
    sortBy: 'recent',
  })
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [mounted, setMounted] = useState(false)
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const hasAnimated = useRef(false)
  const isFirstFilterRun = useRef(true)
  const activeFiltersRef = useRef(activeFilters)
  const sounds = useSoundsContext()

  activeFiltersRef.current = activeFilters

  useEffect(() => {
    fetch('/api/design/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
  }, [])

  useEffect(() => { hasAnimated.current = true; setMounted(true) }, [])

  // Lock body scroll when sheet is open (sheet is only rendered on mobile via md:hidden)
  useEffect(() => {
    if (selectedDesign) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [selectedDesign])

  // Focus trap + focus management for mobile sheet
  useEffect(() => {
    if (!selectedDesign || !sheetRef.current) return
    const sheet = sheetRef.current
    const focusable = sheet.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])'
    )
    if (focusable.length) focusable[0].focus()

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') { setSelectedDesign(null); return }
      if (e.key !== 'Tab') return
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
  }, [selectedDesign])

  const loadDesigns = useCallback(async (offset = 0, append = false) => {
    const f = activeFiltersRef.current
    try {
      const params = new URLSearchParams()
      if (f.industries.length > 0) f.industries.forEach(ind => params.append('industry', ind))
      if (f.search) params.append('search', f.search)
      if (f.sortBy) params.append('sortBy', f.sortBy)
      params.append('limit', String(LIMIT))
      params.append('offset', String(offset))
      const data = await fetch('/api/design/filter-advanced?' + params).then(r => r.json())
      const newDesigns = data.designs || []
      if (append) {
        setDesigns(prev => [...prev, ...newDesigns])
      } else {
        setDesigns(newDesigns)
      }
      setPagination({
        total: data.pagination?.total ?? newDesigns.length,
        hasMore: data.pagination?.hasMore ?? false,
        offset: data.pagination?.offset ?? offset,
      })
    } catch {
      if (!append) setDesigns([])
    }
  }, [])

  // Initial page load
  useEffect(() => {
    loadDesigns(0, false).finally(() => setIsPageLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter changes — debounced, resets to page 0
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false
      return
    }
    setIsFiltering(true)
    const t = setTimeout(() => {
      loadDesigns(0, false).finally(() => setIsFiltering(false))
    }, 200)
    return () => {
      clearTimeout(t)
      setIsFiltering(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters.search, activeFilters.sortBy, activeFilters.industries.join(','), activeFilters.tags.join(',')])

  // Infinite scroll sentinel
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && pagination.hasMore && !isLoadingMore && !isFiltering && !isPageLoading) {
          setIsLoadingMore(true)
          loadDesigns(pagination.offset + LIMIT, true).finally(() => setIsLoadingMore(false))
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(sentinel)
    return () => obs.disconnect()
  }, [pagination.hasMore, pagination.offset, isLoadingMore, isFiltering, isPageLoading, loadDesigns])

  const openPresentation = useCallback((startIndex = 0) => {
    if (designs.length === 0) return
    setPresentationIndex(Math.min(startIndex, designs.length - 1))
  }, [designs.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'p' || e.key === 'P') openPresentation(selectedDesign ? designs.findIndex(d => d.id === selectedDesign.id) : 0)
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openPresentation, selectedDesign, designs])

  const handleCardClick = useCallback((design: Design) => {
    sounds.playSelect()
    setSelectedDesign(design)
  }, [sounds])

  const handleFilterChange = useCallback((industry: string) => {
    sounds.playFilterClick()
    if (industry === 'All') {
      setActiveFilters(prev => ({ ...prev, industries: [], tags: [] }))
    } else {
      setActiveFilters(prev => ({
        ...prev,
        industries: prev.industries.includes(industry)
          ? prev.industries.filter(i => i !== industry)
          : [...prev.industries, industry],
      }))
    }
  }, [sounds])

  const handleTagClick = useCallback((tag: string) => {
    sounds.playFilterClick()
    setActiveFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }))
    setSelectedDesign(null)
  }, [sounds])

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-edge-strong bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center gap-4">

          <h1 className="text-[15px] font-semibold tracking-[-0.04em] text-foreground select-none shrink-0">
            Hitman<span className="font-light opacity-50">'s</span> Library
          </h1>

          {/* Search */}
          <div className="flex-1 max-w-xs hidden sm:flex items-center relative">
            <MagnifyingGlass className="absolute left-2.5 w-3 h-3 text-ink-3 pointer-events-none" weight="regular" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search sites…"
              aria-label="Search sites"
              value={activeFilters.search}
              onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Escape') e.currentTarget.blur() }}
              className="w-full h-7 pl-7 pr-6 text-ui bg-muted/60 border border-edge rounded-[4px] text-foreground placeholder:text-ink-4 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
            />
            {activeFilters.search ? (
              <button
                onClick={() => setActiveFilters(prev => ({ ...prev, search: '' }))}
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
            <Link
              href="/changelog"
              className="hidden sm:flex items-center text-meta text-ink-3 hover:text-ink transition-colors mr-1"
            >
              Changelog
            </Link>

            {/* Sort pills */}
            <div className="hidden sm:flex items-center gap-1 mr-1">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: value }))}
                  aria-pressed={activeFilters.sortBy === value}
                  className={[
                    'px-2 py-0.5 rounded-[4px] text-meta transition-colors border',
                    activeFilters.sortBy === value
                      ? 'bg-muted text-ink border-edge-strong'
                      : 'text-ink-4 border-transparent hover:text-ink-2',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {!isPageLoading && (
              <span className="hidden sm:inline text-meta text-ink-4 tabular-nums mr-1">
                {pagination.total > 0 ? pagination.total : designs.length}
              </span>
            )}

            <button
              onClick={() => openPresentation(selectedDesign ? designs.findIndex(d => d.id === selectedDesign.id) : 0)}
              disabled={designs.length === 0}
              className="w-9 h-9 flex items-center justify-center rounded-[4px] border border-edge-strong text-ink-3 hover:text-ink hover:border-foreground/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Presentation mode"
              title="Presentation mode (P)"
            >
              <Presentation className="w-4 h-4" weight="regular" />
            </button>

            <button
              onClick={() => sounds.setEnabled(p => !p)}
              className="w-9 h-9 flex items-center justify-center rounded-[4px] border border-edge-strong text-ink-3 hover:text-ink hover:border-foreground/40 transition-colors"
              aria-label={sounds.enabled ? 'Mute' : 'Enable sounds'}
            >
              {sounds.enabled ? <SpeakerHigh className="w-4 h-4" weight="regular" /> : <SpeakerSlash className="w-4 h-4" weight="regular" />}
            </button>

            <button
              onClick={(e) => {
                if (isThemeTransitioning.current) return
                const next = resolvedTheme === 'dark' ? 'light' : 'dark'
                if (!document.startViewTransition) { setTheme(next); return }
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
              className="w-9 h-9 flex items-center justify-center rounded-[4px] border border-edge-strong text-ink-3 hover:text-ink hover:border-foreground/40 transition-colors"
              aria-label={mounted && resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <motion.span key={mounted ? resolvedTheme : 'ssr'} initial={{ rotate: -20, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} style={{ display: 'flex' }}>
                {mounted && resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" weight="regular" /> : <Moon className="w-3.5 h-3.5" weight="regular" />}
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className="hidden md:flex md:col-span-2 flex-col sticky top-14 h-[calc(100vh-56px)] border-r border-edge-strong bg-background overflow-y-auto">
          <nav className="flex-1 py-4 px-3" aria-label="Category filters">
            <ul className="space-y-0.5" role="list">
              <li>
                <button
                  onClick={() => handleFilterChange('All')}
                  aria-pressed={activeFilters.industries.length === 0}
                  className={"w-full flex items-center justify-between rounded-[4px] text-bodytext transition-colors px-2.5 py-[7px] " + (activeFilters.industries.length === 0 ? 'text-ink font-medium bg-muted/70' : 'text-ink-3 hover:text-ink-2 hover:bg-muted/40 font-normal')}
                >
                  <span>All</span>
                  <span className="text-meta text-ink-4 tabular-nums">{pagination.total || designs.length}</span>
                </button>
              </li>
              {categories.map(({ name, count }) => {
                const isActive = activeFilters.industries.includes(name)
                return (
                  <li key={name}>
                    <button
                      onClick={() => handleFilterChange(name)}
                      aria-pressed={isActive}
                      className={"w-full flex items-center justify-between rounded-[4px] text-bodytext transition-colors px-2.5 py-[7px] " + (isActive ? 'text-ink font-medium bg-muted/70' : 'text-ink-3 hover:text-ink-2 hover:bg-muted/40 font-normal')}
                    >
                      <span>{name}</span>
                      <span className="text-meta text-ink-4 tabular-nums">{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Gallery */}
        <main className="col-span-1 md:col-span-6 flex flex-col">
          {/* Mobile filters */}
          <div className="md:hidden sticky top-14 z-20 bg-background border-b border-edge-strong">
            {/* Mobile search */}
            <div className="px-4 pt-3 pb-2 relative">
              <MagnifyingGlass className="absolute left-7 top-1/2 -translate-y-[2px] w-3 h-3 text-ink-3 pointer-events-none" weight="regular" />
              <input
                type="text"
                placeholder="Search sites…"
                aria-label="Search sites"
                value={activeFilters.search}
                onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full h-8 pl-8 pr-7 text-ui bg-muted/60 border border-edge rounded-[4px] text-foreground placeholder:text-ink-4 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
              />
              {activeFilters.search && (
                <button
                  onClick={() => setActiveFilters(prev => ({ ...prev, search: '' }))}
                  className="absolute right-7 top-1/2 -translate-y-[2px] text-ink-4 hover:text-ink-2 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
            </div>
            {/* Category + sort pills */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {[{ name: 'All', count: pagination.total || designs.length }, ...categories].map(({ name, count }) => {
                const isActive = name === 'All' ? activeFilters.industries.length === 0 : activeFilters.industries.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => handleFilterChange(name)}
                    aria-pressed={isActive}
                    className={"shrink-0 px-3.5 py-2 rounded-full text-meta transition-colors whitespace-nowrap border " + (isActive ? 'bg-foreground text-background border-foreground' : 'bg-muted text-ink-3 border-edge hover:text-ink')}
                  >
                    {name} <span className="tabular-nums opacity-50">{count}</span>
                  </button>
                )
              })}
              <div className="w-px bg-edge-strong shrink-0 my-1" aria-hidden="true" />
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: value }))}
                  aria-pressed={activeFilters.sortBy === value}
                  className={"shrink-0 px-3.5 py-2 rounded-full text-meta transition-colors whitespace-nowrap border " + (activeFilters.sortBy === value ? 'bg-foreground text-background border-foreground' : 'bg-muted text-ink-3 border-edge hover:text-ink')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 p-5 md:p-6">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 md:gap-5"
              variants={gridVariants}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="show"
            >
              <AnimatePresence mode="sync">
                {(isPageLoading || isFiltering)
                  ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)
                  : designs.length === 0
                    ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3">
                        <p className="text-bodytext text-ink-3">No sites found</p>
                        <button
                          onClick={() => setActiveFilters({ industries: [], tags: [], search: '', sortBy: 'recent' })}
                          className="text-meta text-ink-4 hover:text-ink underline underline-offset-2 transition-colors"
                        >
                          Clear filters
                        </button>
                      </div>
                    )
                    : designs.map((design, i) => (
                      <DesignCard
                        key={design.id}
                        design={design}
                        index={i}
                        isSelected={selectedDesign?.id === design.id}
                        onClick={() => handleCardClick(design)}
                        onHover={() => sounds.playHover()}
                        onTagClick={handleTagClick}
                        hasAnimated={hasAnimated.current}
                      />
                    ))
                }
              </AnimatePresence>
            </motion.div>

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1 mt-4" />
            {isLoadingMore && (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            )}
          </div>
        </main>

        {/* Detail panel */}
        <div className="hidden md:flex md:col-span-4 flex-col sticky top-14 h-[calc(100vh-56px)] border-l border-edge-strong bg-background">
          <AnimatePresence mode="wait">
            {selectedDesign ? (
              <motion.div
                key={selectedDesign.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col h-full"
              >
                <SiteDetailPanel
                  sourceId={Number(selectedDesign.id)}
                  metadata={{
                    tags: selectedDesign.tags,
                    designStyle: selectedDesign.designStyle,
                    complexity: selectedDesign.complexity,
                    useCase: selectedDesign.useCase,
                    industry: selectedDesign.industry,
                  }}
                  onClose={() => setSelectedDesign(null)}
                />
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
                    preview · colors · type · assets
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Mobile bottom sheet */}
      <AnimatePresence>
        {selectedDesign && (
          <>
            {/* Blurred backdrop */}
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[3px]"
              onClick={() => setSelectedDesign(null)}
            />

            {/* Sheet */}
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
                if (info.offset.y > 80 || info.velocity.y > 500) setSelectedDesign(null)
              }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background flex flex-col"
              style={{
                height: '82svh',
                borderRadius: '20px 20px 0 0',
                boxShadow: '0 -12px 40px rgba(0,0,0,0.12)',
              }}
            >
              {/* Drag handle — touch here to swipe down */}
              <div
                className="flex justify-center pt-3 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
                onPointerDown={e => sheetDragControls.start(e)}
              >
                <div className="w-10 h-[5px] rounded-full bg-ink-4" />
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 min-h-0" style={{ touchAction: 'pan-y', paddingBottom: 'var(--safe-bottom)' }}>
                <SiteDetailPanel
                  sourceId={Number(selectedDesign.id)}
                  metadata={{
                    tags: selectedDesign.tags,
                    designStyle: selectedDesign.designStyle,
                    complexity: selectedDesign.complexity,
                    useCase: selectedDesign.useCase,
                    industry: selectedDesign.industry,
                  }}
                  onClose={() => setSelectedDesign(null)}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Presentation mode */}
      <AnimatePresence>
        {presentationIndex !== null && (
          <PresentationMode
            designs={designs}
            initialIndex={presentationIndex}
            onClose={() => setPresentationIndex(null)}
            onSelect={design => { const full = designs.find(d => d.id === design.id); if (full) setSelectedDesign(full) }}
          />
        )}
      </AnimatePresence>

    </div>
  )
}
