'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, SpeakerHigh, SpeakerSlash, MagnifyingGlass, X } from '@phosphor-icons/react'
import { SiteDetailPanel } from '@/components/site-detail-panel'
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
  search: string
  sortBy: 'recent' | 'oldest' | 'name' | 'quality'
}

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
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)

  const { resolvedTheme, setTheme } = useTheme()
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    industries: [],
    search: '',
    sortBy: 'recent',
  })
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])
  const [isPageLoading, setIsPageLoading] = useState(true)
  const [isFiltering, setIsFiltering] = useState(false)
  const hasAnimated = useRef(false)
  const isFirstFilterRun = useRef(true)
  const sounds = useSoundsContext()

  useEffect(() => {
    fetch('/api/design/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
  }, [])

  useEffect(() => { hasAnimated.current = true }, [])

  // Initial page load
  useEffect(() => {
    loadDesignsRef.current().finally(() => setIsPageLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Filter changes — debounced, skips initial mount
  useEffect(() => {
    if (isFirstFilterRun.current) {
      isFirstFilterRun.current = false
      return
    }
    setIsFiltering(true)
    const t = setTimeout(() => {
      loadDesignsRef.current().finally(() => setIsFiltering(false))
    }, 200)
    return () => {
      clearTimeout(t)
      setIsFiltering(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters.search, activeFilters.sortBy, activeFilters.industries.join(',')])

  const loadDesigns = async () => {
    try {
      const params = new URLSearchParams()
      if (activeFilters.industries.length > 0) {
        activeFilters.industries.forEach(ind => params.append('industry', ind))
      }
      if (activeFilters.search) params.append('search', activeFilters.search)
      if (activeFilters.sortBy) params.append('sortBy', activeFilters.sortBy)
      const response = await fetch('/api/design/filter-advanced?' + params)
      const data = await response.json()
      setDesigns(data.designs || [])
    } catch {
      setDesigns([])
    }
  }
  const loadDesignsRef = useRef(loadDesigns)
  loadDesignsRef.current = loadDesigns

  const handleCardClick = useCallback((design: Design) => {
    sounds.playSelect()
    setSelectedDesign(design)
  }, [sounds])

  const handleFilterChange = useCallback((industry: string) => {
    sounds.playFilterClick()
    if (industry === 'All') {
      setActiveFilters(prev => ({ ...prev, industries: [] }))
    } else {
      setActiveFilters(prev => ({
        ...prev,
        industries: prev.industries.includes(industry)
          ? prev.industries.filter(i => i !== industry)
          : [industry],
      }))
    }
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

            {!isPageLoading && (
              <span className="hidden sm:inline text-[11px] font-mono text-muted-foreground tabular-nums mr-1">
                {designs.length}
              </span>
            )}

            <button
              onClick={() => sounds.setEnabled(p => !p)}
              className="w-8 h-8 flex items-center justify-center rounded-sm border border-border/60 text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
              aria-label={sounds.enabled ? 'Mute' : 'Enable sounds'}
            >
              {sounds.enabled ? <SpeakerHigh className="w-3.5 h-3.5" weight="regular" /> : <SpeakerSlash className="w-3.5 h-3.5" weight="regular" />}
            </button>

            <button
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
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
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                  : designs.map(design => (
                    <DesignCard
                      key={design.id}
                      design={design}
                      isSelected={selectedDesign?.id === design.id}
                      onClick={() => handleCardClick(design)}
                      onHover={() => sounds.playHover()}
                      hasAnimated={hasAnimated.current}
                    />
                  ))
                }
              </AnimatePresence>
            </motion.div>
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
        {selectedDesign && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30 top-14"
              onClick={() => setSelectedDesign(null)}
              role="presentation"
              aria-hidden="true"
            />
            <dialog
              className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/60 rounded-t-xl z-40 h-[72vh] w-full flex flex-col"
              open
              aria-label="Design details"
            >
              <SiteDetailPanel
                sourceId={Number(selectedDesign.id)}
                onClose={() => setSelectedDesign(null)}
              />
            </dialog>
          </>
        )}
      </div>
    </div>
  )
}

/* Design card */
interface DesignCardProps {
  design: Design
  isSelected: boolean
  onClick: () => void
  onHover: () => void
  hasAnimated: boolean
}

function DesignCard({ design, isSelected, onClick, onHover, hasAnimated }: DesignCardProps) {
  const [imgStatus, setImgStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const domain = getDomain(design.url)

  return (
    <motion.article
      variants={cardVariants}
      initial={hasAnimated ? false : 'hidden'}
      animate="show"
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }}
      onClick={onClick}
      onHoverStart={onHover}
      className={"group relative flex flex-col cursor-pointer rounded-[4px] overflow-hidden border transition-colors " + (isSelected ? 'border-foreground/50' : 'border-border/60 hover:border-foreground/25')}
    >
      {/* Screenshot */}
      <div className="relative overflow-hidden bg-muted aspect-[16/10]">
        {imgStatus === 'loading' && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        {design.thumbnail_url && (
          <img
            src={design.thumbnail_url}
            alt={design.title || domain}
            referrerPolicy="no-referrer"
            loading="lazy"
            onLoad={() => setImgStatus('loaded')}
            onError={() => setImgStatus('error')}
            className={"w-full h-full object-cover object-top transition-[opacity,transform] duration-300 group-hover:scale-[1.03] " + (imgStatus === 'loaded' ? 'opacity-100' : 'opacity-0')}
          />
        )}
        {imgStatus === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-mono text-muted-foreground/40">{domain}</span>
          </div>
        )}

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-all duration-300 pointer-events-none" />
      </div>

      {/* Metadata */}
      <div className="px-3.5 py-3 flex items-center justify-between gap-3 bg-background">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-foreground leading-snug line-clamp-1 tracking-[-0.01em]">
            {design.title}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">{domain}</p>
        </div>

        {design.colors.length > 0 && (
          <div className="flex gap-1 shrink-0">
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
