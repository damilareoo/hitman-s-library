'use client'

import React from "react"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, Sun, Moon, Menu, Trash2 } from 'lucide-react'
import { SiteThumbnail } from '@/components/site-thumbnail'
import { SiteDetailPanel } from '@/components/site-detail-panel'
import { motion, AnimatePresence } from 'motion/react'

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
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

interface CopyFeedback {
  id: string
  text: string
  type: 'color' | 'text'
}

interface ActiveFilters {
  industries: string[]
  styles: string[]
  layouts: string[]
  colors: string[]
  complexity?: string
  useCases: string[]
  animations: string[]
  accessibility: string[]
  search: string
  sortBy: 'recent' | 'oldest' | 'name' | 'quality'
}

export default function DesignLibrary() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null)
  const [linkInput, setLinkInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [copied, setCopied] = useState(false)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    industries: [],
    styles: [],
    layouts: [],
    colors: [],
    useCases: [],
    animations: [],
    accessibility: [],
    search: '',
    sortBy: 'recent'
  })
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [copyFeedbacks, setCopyFeedbacks] = useState<CopyFeedback[]>([])
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([])

  useEffect(() => {
    fetch('/api/design/categories')
      .then(r => r.json())
      .then(d => setCategories(d.categories || []))
  }, [])

  const hasAnimated = useRef(false)
  useEffect(() => { hasAnimated.current = true }, [])

  const filteredDesigns = designs

  // Seamless theme switching without any flash or delay
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    
    // Update state and localStorage immediately (no delay)
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    // Update DOM class immediately for instant CSS transition
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  // Initialize theme state from localStorage/system preference (layout.tsx handles the DOM)
  useEffect(() => {
    // Just sync state with what layout.tsx already set in the DOM
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  // Load designs on mount and when filters change
  useEffect(() => {
    loadDesigns()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeFilters)])

  // Intuitive copy feedback with auto-dismiss
  const handleCopy = (text: string, type: 'color' | 'text') => {
    navigator.clipboard.writeText(text)
    
    const feedbackId = `${type}-${Date.now()}-${Math.random()}`
    const feedbackItem: CopyFeedback = {
      id: feedbackId,
      text: type === 'color' ? `Copied ${text}` : 'Copied to clipboard',
      type,
    }
    
    setCopyFeedbacks(prev => [...prev, feedbackItem])
    
    // Auto-remove after 2 seconds
    setTimeout(() => {
      setCopyFeedbacks(prev => prev.filter(f => f.id !== feedbackId))
    }, 2000)
  }

  // Load designs with advanced filtering
  const loadDesigns = async () => {
    try {
      const params = new URLSearchParams()
      
      // Add all filter parameters
      if (activeFilters.industries.length > 0) {
        activeFilters.industries.forEach(ind => params.append('industry', ind))
      }
      if (activeFilters.styles.length > 0) {
        activeFilters.styles.forEach(style => params.append('style', style))
      }
      if (activeFilters.layouts.length > 0) {
        activeFilters.layouts.forEach(layout => params.append('layout', layout))
      }
      if (activeFilters.colors.length > 0) {
        activeFilters.colors.forEach(color => params.append('color', color))
      }
      if (activeFilters.useCases.length > 0) {
        activeFilters.useCases.forEach(useCase => params.append('useCase', useCase))
      }
      if (activeFilters.animations.length > 0) {
        activeFilters.animations.forEach(anim => params.append('animation', anim))
      }
      if (activeFilters.accessibility.length > 0) {
        activeFilters.accessibility.forEach(access => params.append('accessibility', access))
      }
      if (activeFilters.search) {
        params.append('search', activeFilters.search)
      }
      if (activeFilters.sortBy) {
        params.append('sortBy', activeFilters.sortBy)
      }

      const response = await fetch(`/api/design/filter-advanced?${params}`)
      const data = await response.json()
      setDesigns(data.designs || [])
    } catch (error) {
      console.error('Load designs error:', error)
      setDesigns([])
    }
  }

  const handleAddLink = async () => {
    if (!linkInput.trim()) {
      alert('Please enter a website URL')
      return
    }

    setIsLoading(true)
    try {
      console.log('[v0] Extracting design from:', linkInput)
      const response = await fetch('/api/design/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkInput,
          notes: ''
          // No industry parameter - auto-detection will happen in the API
        })
      })

      const data = await response.json()
      console.log('[v0] Extract response:', data)

      if (data.isDuplicate) {
        alert('⚠ Already Added\n\nThis website is already in your collection')
      } else if (data.success || data.id) {
        console.log('[v0] Design extracted successfully with auto-detected industry:', data.industry)
        alert(`✓ "${data.title}" added as ${data.industry}\n\nDesign categorized automatically`)
        setLinkInput('')
        loadDesigns()
      } else if (data.error) {
        console.warn('[v0] Extraction error:', data.error)
        alert(`⚠ ${data.error}\n\n${data.warning || 'Try another website'}`)
      } else {
        console.error('[v0] Unexpected response:', data)
        alert('Failed to add design. Please try another website.')
      }
    } catch (error) {
      console.error('[v0] Error adding design:', error)
      alert('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (designId: string, e?: React.MouseEvent) => {
    if (e?.stopPropagation) e.stopPropagation()
    if (!confirm('Remove this design from your collection?')) return
    
    try {
      const response = await fetch('/api/design/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: designId })
      })
      if (response.ok) {
        setDesigns(prev => prev.filter(d => d.id !== designId))
        if (selectedDesign?.id === designId) setSelectedDesign(null)
      } else {
        alert('Failed to delete. Please try again.')
      }
    } catch (error) {
      console.error('[v0] Delete error:', error)
      alert('Error deleting design')
    }
  }

  const generatePrompt = async (design: Design) => {
    try {
      console.log('[v0] Generating comprehensive prompt for:', design.title)
      const response = await fetch('/api/design/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design })
      })

      const result = await response.json()
      
      if (result.success && result.prompt) {
        navigator.clipboard.writeText(result.prompt)
        setCopied(true)
        setTimeout(() => setCopied(false), 3000)
        console.log('[v0] Prompt copied to clipboard')
        alert('✓ Comprehensive design prompt copied to clipboard')
      } else {
        console.error('[v0] Failed to generate prompt:', result.error)
        alert('Failed to generate prompt')
      }
    } catch (error) {
      console.error('[v0] Prompt generation error:', error)
      alert('Error generating prompt')
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      console.log('[v0] Uploading file:', file.name)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/design/import-excel', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      console.log('[v0] Import response:', data)

      if (data.designs && data.designs.length > 0) {
        alert(`✓ Successfully imported ${data.designs.length} designs from ${file.name}`)
        // Reset file input
        if (fileInputRef) {
          fileInputRef.value = ''
        }
        loadDesigns()
      } else {
        alert(`⚠ No valid designs found in ${file.name}. Please check the file format.`)
      }
    } catch (error) {
      console.error('[v0] File upload error:', error)
      alert('Error uploading file: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsLoading(false)
    }
  }

  // Filtering is now done server-side via advanced API
  // Designs are already filtered through the API response

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setShowMobileMenu(false)} role="presentation" aria-hidden="true" />
            <nav className="fixed left-0 top-16 bottom-0 w-72 bg-background border-r border-border/20 z-40 overflow-y-auto md:hidden" aria-label="Mobile navigation">
              <div className="p-5 space-y-6">
                {/* Add Design */}
                <div className="space-y-2">
                  <p className="text-xs uppercase font-mono font-semibold tracking-widest text-muted-foreground">Add Site</p>
                  <Input placeholder="https://example.com" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddLink()} disabled={isLoading} className="font-mono text-xs h-9" aria-label="Website URL" />
                  <Button onClick={handleAddLink} disabled={isLoading || !linkInput.trim()} className="w-full h-9 font-mono text-xs">{isLoading ? 'Extracting...' : 'Add'}</Button>
                </div>
                <div className="h-px bg-border/20" />
                {/* Category Filters */}
                <div className="space-y-0.5">
                  <p className="text-xs uppercase font-mono font-semibold tracking-widest text-muted-foreground mb-3">Filter</p>
                  {[{ name: 'All', count: designs.length }, ...categories].map(({ name, count }) => {
                    const isActive = name === 'All' ? activeFilters.industries.length === 0 : activeFilters.industries.includes(name)
                    return (
                      <button
                        key={name}
                        onClick={() => {
                          if (name === 'All') {
                            setActiveFilters(prev => ({ ...prev, industries: [] }))
                          } else {
                            setActiveFilters(prev => ({
                              ...prev,
                              industries: isActive ? prev.industries.filter(i => i !== name) : [name]
                            }))
                          }
                          setShowMobileMenu(false)
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors ${
                          isActive
                            ? 'text-foreground bg-muted font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-foreground' : 'bg-transparent'}`} />
                          {name}
                        </span>
                        <span className="text-xs opacity-50 tabular-nums">{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </nav>
          </>
        )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background">
        <div className="h-16 px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold font-mono">Hitman's Library</h1>
          <div className="flex items-center gap-3">
            <button onClick={toggleTheme} className="p-2 hover:bg-muted rounded-sm border border-border/40 grid-transition" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
              {theme === 'light' ? <Moon className="w-5 h-5" aria-hidden="true" /> : <Sun className="w-5 h-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 min-h-[calc(100vh-64px)]">
        {/* Sidebar - Desktop Only, Sticky */}
        <aside className="hidden md:flex md:col-span-3 flex-col sticky top-16 h-[calc(100vh-64px)] border-r border-border/20 bg-background/50 overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Category Nav */}
            <nav className="flex-1 overflow-y-auto p-5" aria-label="Category filters">
              <p className="text-xs uppercase font-mono font-semibold tracking-widest text-muted-foreground mb-3">Filter</p>
              <ul className="space-y-0.5">
                {/* All */}
                <li>
                  <button
                    onClick={() => setActiveFilters(prev => ({ ...prev, industries: [] }))}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors ${
                      activeFilters.industries.length === 0
                        ? 'text-foreground bg-muted font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeFilters.industries.length === 0 ? 'bg-foreground' : 'bg-transparent'}`} />
                      All
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{designs.length}</span>
                  </button>
                </li>
                {categories.map(({ name, count }) => {
                  const isActive = activeFilters.industries.includes(name)
                  return (
                    <li key={name}>
                      <button
                        onClick={() => setActiveFilters(prev => ({
                          ...prev,
                          industries: isActive ? prev.industries.filter(i => i !== name) : [name]
                        }))}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-mono transition-colors ${
                          isActive
                            ? 'text-foreground bg-muted font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-foreground' : 'bg-transparent'}`} />
                          {name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Gallery - Takes remaining space */}
        <div className="col-span-1 md:col-span-6 flex flex-col h-full">
          {/* Mobile category pill bar - sticky below header */}
          <div className="md:hidden sticky top-16 z-20 flex gap-2 overflow-x-auto px-4 pt-4 pb-2 no-scrollbar bg-background border-b border-border/30 flex-shrink-0">
            {[{ name: 'All', count: designs.length }, ...categories].map(({ name, count }) => {
              const isActive = name === 'All' ? activeFilters.industries.length === 0 : activeFilters.industries.includes(name)
              return (
                <button
                  key={name}
                  onClick={() => {
                    if (name === 'All') {
                      setActiveFilters(prev => ({ ...prev, industries: [] }))
                    } else {
                      setActiveFilters(prev => ({
                        ...prev,
                        industries: isActive ? prev.industries.filter(i => i !== name) : [name]
                      }))
                    }
                  }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-foreground text-background font-medium'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {name}
                  <span className={`text-[10px] tabular-nums ${isActive ? 'opacity-70' : 'opacity-50'}`}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 md:p-8">
            {/* Gallery Grid */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6"
              variants={gridVariants}
              initial={hasAnimated.current ? false : 'hidden'}
              animate="show"
            >
              <AnimatePresence mode="popLayout">
              {filteredDesigns.map((design) => (
                <motion.div
                  key={design.id}
                  layout
                  variants={cardVariants}
                  initial={hasAnimated.current ? false : 'hidden'}
                  animate="show"
                  exit={{ scale: 0.9, opacity: 0, transition: { duration: 0.15, ease: 'easeIn' } }}
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setSelectedDesign(design)}
                  className="group relative flex flex-col border border-border/40 rounded-lg overflow-hidden hover:border-border/70 text-left cursor-pointer"
                >
                  {/* Website Hero Screenshot */}
                  <SiteThumbnail
                    url={design.url}
                    alt={design.title}
                  />

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col p-4 sm:p-5">
                    <div className="flex-1 space-y-2.5 mb-3">
                      <h3 className="font-bold text-sm sm:text-base font-mono line-clamp-2 text-foreground group-hover:text-foreground/90 transition-colors leading-snug">
                        {design.title}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                        {design.industry}
                      </p>
                    </div>

                    {/* Footer - Color Count */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/20">
                      <div className="flex gap-1">
                        {design.colors.slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 border border-border/50 rounded-xs transition-all group-hover:ring-1 group-hover:ring-offset-1 group-hover:ring-offset-background group-hover:ring-primary/40"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        {design.colors.length > 4 && <div className="text-xs text-muted-foreground font-mono ml-1">+{design.colors.length - 4}</div>}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{design.colors.length} colors</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              </AnimatePresence>
            </motion.div>
            </div>
          </div>
        </div>

        {/* Details Panel - Desktop Only */}
        <div className="hidden md:flex md:col-span-3 flex-col sticky top-16 h-[calc(100vh-64px)] border-l border-border/20 bg-background/50">
          {selectedDesign && (
            <SiteDetailPanel
              sourceId={Number(selectedDesign.id)}
              onClose={() => setSelectedDesign(null)}
            />
          )}
        </div>

        {/* Mobile Details Bottom Sheet */}
        {selectedDesign && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/40 z-30 top-16" onClick={() => setSelectedDesign(null)} role="presentation" aria-hidden="true" />
            <dialog className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/20 rounded-t-xl z-40 max-h-[70vh] w-full flex flex-col" open aria-label="Design details">
              <SiteDetailPanel
                sourceId={Number(selectedDesign.id)}
                onClose={() => setSelectedDesign(null)}
              />
            </dialog>
          </>
        )}

        {/* Copy Feedback Toasts */}
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {copyFeedbacks.map(feedback => (
            <div 
              key={feedback.id}
              className="bg-foreground text-background px-4 py-2 rounded-sm text-sm font-mono animate-in fade-in slide-in-from-bottom-2 duration-300 pointer-events-auto shadow-lg"
            >
              {feedback.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
