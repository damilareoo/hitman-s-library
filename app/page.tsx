'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X, Presentation } from '@phosphor-icons/react'
import { SiteDetailPanel } from '@/components/site-detail-panel'
import { PresentationMode } from '@/components/presentation-mode'
import { motion, AnimatePresence } from 'motion/react'
import { useSoundsContext } from '@/contexts/sounds-context'
import Link from 'next/link'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
}

interface Design {
  id: string
  url: string
  title: string
  industry: string
  thumbnail_url?: string
  fallback_thumbnail?: string | null
  colors: string[]
  typography: string[]
  layout: string
  quality: number
  tags: string[]
  architecture: string
  addedDate: string
  designStyle?: string
  complexity?: string
  useCase?: string
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

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function SkeletonCard() {
  return (
    <div className="flex flex-col border border-border/40 rounded-[4px] overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-muted" />
      <div className="px-3.5 py-3 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/2" />
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
  const isThemeTransitioning = useRef(false)
  const mobileDialogRef = useRef<HTMLDialogElement>(null)

  const { resolvedTheme, setTheme } = useTheme()
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    industries: [],
    tags: [],
    search: '',
    sortBy: 'recent',
  })
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
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

  useEffect(() => { hasAnimated.current = true }, [])

  useEffect(() => {
    const dialog = mobileDialogRef.current
    if (!dialog) return
    if (selectedDesign) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [selectedDesign])

  useEffect(() => {
    const dialog = mobileDialogRef.current
    if (!dialog) return
    const handleClose = () => setSelectedDesign(null)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

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
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center gap-4">

          <h1 className="text-[15px] font-medium tracking-[-0.01em] text-foreground select-none shrink-0">
            Hitman's Library
          </h1>

          {/* Search */}
          <div className="flex-1 max-w-xs hidden sm:flex items-center relative">
            <MagnifyingGlass className="absolute left-2.5 w-3 h-3 text-muted-foreground/50 pointer-events-none" weight="regular" />
            <input
              type="text"
              placeholder="Search sites…"
              aria-label="Search sites"
              value={activeFilters.search}
              onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full h-7 pl-7 pr-6 text-[12px] font-mono bg-muted/60 border border-border/50 rounded-[3px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
            />
            {activeFilters.search && (
              <button
                onClick={() => setActiveFilters(prev => ({ ...prev, search: '' }))}
                className="absolute right-2 text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3" weight="bold" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Link
              href="/changelog"
              className="hidden sm:flex items-center text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors mr-1"
            >
              Changelog
            </Link>

            {/* Sort pills */}
            <div className="hidden sm:flex items-center gap-px mr-1">
              {SORT_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setActiveFilters(prev => ({ ...prev, sortBy: value }))}
                  aria-pressed={activeFilters.sortBy === value}
                  className={[
                    'px-2 py-0.5 rounded-[3px] text-[10px] font-mono transition-colors',
                    activeFilters.sortBy === value
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground/50 hover:text-muted-foreground',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {!isPageLoading && (
              <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground/50 tabular-nums mr-1">
                {pagination.total > 0 ? pagination.total : designs.length}
              </span>
            )}

            <button
              onClick={() => openPresentation(selectedDesign ? designs.findIndex(d => d.id === selectedDesign.id) : 0)}
              disabled={designs.length === 0}
              className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Presentation mode"
              title="Presentation mode (P)"
            >
              <Presentation className="w-3.5 h-3.5" weight="regular" />
            </button>

            <button
              onClick={() => sounds.setEnabled(p => !p)}
              className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label={sounds.enabled ? 'Mute' : 'Enable sounds'}
            >
              {sounds.enabled ? <SpeakerHigh className="w-3.5 h-3.5" weight="regular" /> : <SpeakerSlash className="w-3.5 h-3.5" weight="regular" />}
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
              className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label="Toggle theme"
            >
              <motion.span key={resolvedTheme} initial={{ rotate: -20, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} style={{ display: 'flex' }}>
                {resolvedTheme === 'dark' ? <Sun className="w-3.5 h-3.5" weight="regular" /> : <Moon className="w-3.5 h-3.5" weight="regular" />}
              </motion.span>
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[calc(100vh-56px)]">

        {/* Sidebar */}
        <aside className="hidden md:flex md:col-span-2 flex-col sticky top-14 h-[calc(100vh-56px)] border-r border-border/60 bg-background overflow-y-auto">
          <nav className="flex-1 p-4 pt-5" aria-label="Category filters">
            <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground mb-3 px-2">
              Browse
            </p>
            <ul className="space-y-px" role="list">
              <li>
                <button
                  onClick={() => handleFilterChange('All')}
                  aria-pressed={activeFilters.industries.length === 0}
                  className={"w-full flex items-center justify-between px-2 py-1.5 rounded-[3px] text-[13px] transition-colors " + (activeFilters.industries.length === 0 ? 'text-foreground font-medium bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40')}
                >
                  <span>All</span>
                  <span className="text-[11px] tabular-nums font-mono opacity-50">{designs.length}</span>
                </button>
              </li>
              {categories.map(({ name, count }) => {
                const isActive = activeFilters.industries.includes(name)
                return (
                  <li key={name}>
                    <button
                      onClick={() => handleFilterChange(name)}
                      aria-pressed={isActive}
                      className={"w-full flex items-center justify-between px-2 py-1.5 rounded-[3px] text-[13px] transition-colors " + (isActive ? 'text-foreground font-medium bg-muted' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40')}
                    >
                      <span>{name}</span>
                      <span className="text-[11px] tabular-nums font-mono opacity-50">{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Gallery */}
        <main className="col-span-1 md:col-span-7 flex flex-col">
          {/* Mobile filters */}
          <div className="md:hidden sticky top-14 z-20 bg-background border-b border-border/60">
            {/* Mobile search */}
            <div className="px-4 pt-3 pb-2 relative">
              <MagnifyingGlass className="absolute left-7 top-1/2 -translate-y-[2px] w-3 h-3 text-muted-foreground/50 pointer-events-none" weight="regular" />
              <input
                type="text"
                placeholder="Search sites…"
                aria-label="Search sites"
                value={activeFilters.search}
                onChange={e => setActiveFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full h-8 pl-8 pr-7 text-[12px] font-mono bg-muted/60 border border-border/50 rounded-[3px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/30 focus:bg-muted transition-colors"
              />
              {activeFilters.search && (
                <button
                  onClick={() => setActiveFilters(prev => ({ ...prev, search: '' }))}
                  className="absolute right-7 top-1/2 -translate-y-[2px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" weight="bold" />
                </button>
              )}
            </div>
            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {[{ name: 'All', count: designs.length }, ...categories].map(({ name, count }) => {
                const isActive = name === 'All' ? activeFilters.industries.length === 0 : activeFilters.industries.includes(name)
                return (
                  <button
                    key={name}
                    onClick={() => handleFilterChange(name)}
                    aria-pressed={isActive}
                    className={"shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap " + (isActive ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground hover:text-foreground')}
                  >
                    {name} <span className="opacity-50 font-mono text-[10px]">{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 p-5 md:p-6">
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5"
              variants={gridVariants}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="show"
            >
              <AnimatePresence mode="popLayout">
                {(isPageLoading || isFiltering)
                  ? Array.from({ length: LIMIT }).map((_, i) => <SkeletonCard key={i} />)
                  : designs.length === 0
                    ? (
                      <div className="col-span-full flex flex-col items-center justify-center py-24 gap-3">
                        <p className="text-[13px] text-muted-foreground/50">No sites found</p>
                        <button
                          onClick={() => setActiveFilters({ industries: [], tags: [], search: '', sortBy: 'recent' })}
                          className="text-[11px] font-mono text-muted-foreground/40 hover:text-foreground underline underline-offset-2 transition-colors"
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
                <div className="w-4 h-4 border border-border border-t-foreground/50 rounded-full animate-spin" />
              </div>
            )}
          </div>
        </main>

        {/* Detail panel */}
        <div className="hidden md:flex md:col-span-3 flex-col sticky top-14 h-[calc(100vh-56px)] border-l border-border/60 bg-background">
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
                <p className="text-[12px] font-mono text-muted-foreground/50">Select a site</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile bottom sheet */}
        <dialog
          ref={mobileDialogRef}
          className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 rounded-t-xl z-40 h-[72vh] w-full flex flex-col p-0 max-w-full"
          aria-label="Design details"
        >
          {selectedDesign && (
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
          )}
        </dialog>
      </div>
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

/* Design card */
interface DesignCardProps {
  design: Design
  index: number
  isSelected: boolean
  onClick: () => void
  onHover: () => void
  onTagClick: (tag: string) => void
  hasAnimated: boolean
}

function DesignCard({ design, index, isSelected, onClick, onHover, onTagClick, hasAnimated }: DesignCardProps) {
  const [imgSrc, setImgSrc] = useState<string | null>(design.thumbnail_url ?? null)
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const domain = getDomain(design.url)

  function handleImgError() {
    // Primary failed — try fallback (external OG image)
    if (design.fallback_thumbnail && imgSrc !== design.fallback_thumbnail) {
      setImgSrc(design.fallback_thumbnail)
      setImgStatus('loading')
    } else {
      setImgStatus('error')
    }
  }

  return (
    <motion.article
      variants={cardVariants}
      initial={hasAnimated ? false : 'hidden'}
      animate="show"
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      onClick={onClick}
      onHoverStart={onHover}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View ${design.title || getDomain(design.url)}`}
      style={{ contain: 'layout paint style' }}
      className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-1 " + (isSelected ? 'border-foreground/50' : 'border-border/60 hover:border-foreground/25')}
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {imgStatus === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {imgSrc && (
          <img
            src={imgSrc}
            alt={design.title || domain}
            referrerPolicy="no-referrer"
            loading={index < 6 ? 'eager' : 'lazy'}
            fetchPriority={index < 3 ? 'high' : 'auto'}
            onLoad={e => (e.currentTarget.naturalWidth > 0 ? setImgStatus('loaded') : handleImgError())}
            onError={handleImgError}
            className={"w-full h-full object-cover object-top transition-[opacity,transform] duration-300 group-hover:scale-[1.03] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-mono text-muted-foreground/40">{domain}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 pointer-events-none" />

        {/* Visit overlay button */}
        <a
          href={design.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1 bg-background/90 backdrop-blur-sm border border-border/50 rounded-[3px] px-2 py-1 text-[10px] font-mono text-foreground hover:border-foreground/50 hover:bg-background"
        >
          ↗
        </a>
      </div>

      {/* Metadata */}
      <div className="px-3.5 py-3 flex items-start justify-between gap-3 bg-background">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-1 tracking-[-0.01em]">
            {design.title}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">{domain}</p>
          {design.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1.5">
              {design.tags.slice(0, 3).map(tag => (
                <button
                  key={tag}
                  onClick={e => { e.stopPropagation(); onTagClick(tag) }}
                  className="px-1.5 py-0.5 rounded-[2px] bg-muted text-[9px] font-mono text-muted-foreground/60 leading-none hover:bg-foreground hover:text-background transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {design.colors.length > 0 && (
          <div className="flex gap-1 shrink-0 mt-0.5">
            {design.colors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full border border-black/10 dark:border-white/10"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        )}
      </div>
    </motion.article>
  )
}
