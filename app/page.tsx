'use client'

import React from "react"

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, X, Copy, Check, Sun, Moon, Menu } from 'lucide-react'
import AdvancedFilters from '@/components/AdvancedFilters'
import { BackupUtility } from '@/components/backup-utility'
import { TypographyDisplay } from '@/components/typography-display'

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
  const [mobinUrl, setMobinUrl] = useState('')
  const [mobinLoading, setMobinLoading] = useState(false)
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

  // Load designs on mount only (not on every filter change to avoid infinite loops)
  useEffect(() => {
    loadDesigns()
  }, [])

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

      if (data.success || data.id) {
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

  const handleMobinImport = async () => {
    if (!mobinUrl.trim()) return
    setMobinLoading(true)
    try {
      // First, fetch the sites from Mobbin
      const fetchRes = await fetch('/api/design/import-mobbin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobbin_url: mobinUrl })
      })
      const fetchData = await fetchRes.json()
      
      if (!fetchData.sites || fetchData.sites.length === 0) {
        alert('No sites found or error fetching Mobbin page')
        console.error('[v0] Fetch error:', fetchData)
        return
      }

      // Then add them to the database
      const addRes = await fetch('/api/design/add-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sites: fetchData.sites })
      })
      const addData = await addRes.json()
      
      alert(`✓ Added ${addData.added} sites from Mobbin!`)
      setMobinUrl('')
      
      // Reload designs
      loadDesigns()
    } catch (error) {
      alert('Error importing from Mobbin: ' + (error instanceof Error ? error.message : String(error)))
      console.error('[v0] Mobbin import error:', error)
    } finally {
      setMobinLoading(false)
    }
  }

  // Filtering is now done server-side via advanced API
  // Designs are already filtered through the API response

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Navigation Drawer */}
        {showMobileMenu && (
          <>
            <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setShowMobileMenu(false)} role="presentation" aria-hidden="true" />
            <nav className="fixed left-0 top-16 bottom-0 w-64 bg-background border-r border-border/20 z-40 overflow-y-auto md:hidden" aria-label="Mobile navigation">
              <div className="p-4 space-y-4">
                {/* Add Design */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">Quick Add</h3>
                  <Input placeholder="https://..." value={linkInput} onChange={(e) => setLinkInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddLink()} disabled={isLoading} className="font-mono text-xs h-9 grid-transition" aria-label="Website URL for quick add" />
                  <Button onClick={handleAddLink} disabled={isLoading || !linkInput.trim()} className="w-full h-9 font-mono text-xs">{isLoading ? 'Extracting...' : 'Add'}</Button>
                </div>
                <div className="h-px bg-border/20" />
                {/* Batch Import */}
                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">Import</h3>
                  <Button onClick={() => fileInputRef?.click()} disabled={isLoading} className="w-full gap-2 h-9 font-mono text-xs bg-primary/5 border border-primary/30 hover:bg-primary/10">{isLoading ? 'Uploading...' : '📄 Upload CSV/Excel'}</Button>
                  <p className="text-xs text-muted-foreground font-mono">Auto-detects categories</p>
                </div>
                <div className="h-px bg-border/20" />
                {/* Backup & Restore - Desktop only */}
                <div className="hidden lg:block">
                  <BackupUtility onImportComplete={() => loadDesigns()} />
                </div>
              </div>
            </nav>
          </>
        )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background">
        <div className="h-16 px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold font-mono">Design Library</h1>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="md:hidden p-2 hover:bg-muted rounded-sm border border-border/40 grid-transition" aria-label="Toggle navigation menu" aria-expanded={showMobileMenu} aria-controls="mobile-menu">
              {showMobileMenu ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>
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
          <div className="p-6 space-y-6">
            {/* Add Design Section */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">Quick Add</h3>
              <div className="space-y-2.5">
                <div>
                  <label className="text-xs font-mono text-muted-foreground/80 block mb-1.5">Website URL</label>
                  <Input placeholder="https://example.com" value={linkInput} onChange={(e) => setLinkInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleAddLink()} disabled={isLoading} className="font-mono text-xs h-9 grid-transition focus:ring-2 focus:ring-primary/40 focus:ring-offset-1 focus:ring-offset-background border-border/60 hover:border-border/80" />
                  <p className="text-xs text-muted-foreground/60 font-mono mt-1">Category auto-detected</p>
                </div>
                <Button onClick={handleAddLink} disabled={isLoading || !linkInput.trim()} className="w-full h-9 font-mono text-xs">
                  {isLoading ? <>Analyzing & Extracting...</> : 'Add Design'}
                </Button>
              </div>
            </div>

            <div className="h-px bg-border/20" />

            {/* Import Section - Prominent */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">Batch Import</h3>
              <div className="space-y-2">
                <Button variant="outline" onClick={() => fileInputRef?.click()} disabled={isLoading} className="w-full gap-2 h-10 font-mono text-xs bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50">
                  <Upload className="w-4 h-4" /> Upload Excel/CSV
                </Button>
                <p className="text-xs text-muted-foreground font-mono">Auto-categorizes designs • Format: URL, Title, Notes</p>
              </div>
              <input ref={(ref) => setFileInputRef(ref)} type="file" accept=".xlsx,.csv" onChange={handleFileUpload} className="hidden" />
            </div>

            <div className="h-px bg-border/20" />

            {/* Mobbin Import */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-mono font-semibold tracking-wider text-foreground">Import from Mobbin</h3>
              <Input placeholder="https://mobbin.com/discover/sites/latest" value={mobinUrl} onChange={(e) => setMobinUrl(e.target.value)} disabled={mobinLoading} className="font-mono text-xs h-9 grid-transition" />
              <Button onClick={handleMobinImport} disabled={mobinLoading || !mobinUrl.trim()} className="w-full h-9 font-mono text-xs">
                {mobinLoading ? 'Importing...' : 'Import from Mobbin'}
              </Button>
            </div>

            <div className="h-px bg-border/20" />

            {/* Filters */}
            <AdvancedFilters onFiltersChange={setActiveFilters} onClearAll={() => setActiveFilters({ industries: [], styles: [], layouts: [], colors: [], useCases: [], animations: [], accessibility: [], search: '', sortBy: 'recent' })} />
          </div>
        </aside>

        {/* Gallery - Takes remaining space */}
        <div className="col-span-1 md:col-span-6 overflow-y-auto">
          <div className="p-4 sm:p-6 md:p-8">
            {/* Gallery Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredDesigns.map((design) => (
                <button
                  key={design.id}
                  onClick={() => setSelectedDesign(design)}
                  className="group flex flex-col border border-border/40 rounded-lg overflow-hidden grid-transition hover:border-border/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background text-left"
                >
                  {/* Thumbnail Area - 2:1 Ratio */}
                  <div className="relative w-full bg-muted aspect-video overflow-hidden group/thumb">
                    <img
                      src={`https://image.thum.io/get/width/600/crop/338/noanimate/${design.url}`}
                      alt={design.title}
                      className="w-full h-full object-cover object-top group-hover/thumb:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 flex flex-col p-4 sm:p-5">
                    <div className="flex-1 space-y-2.5 mb-3">
                      <h3 className="font-bold text-sm sm:text-base font-mono line-clamp-2 text-foreground group-hover:text-foreground/90 grid-transition leading-snug">
                        {design.title}
                      </h3>
                      <p className="text-xs font-mono text-muted-foreground group-hover:text-muted-foreground/80 grid-transition">
                        {design.industry}
                      </p>
                    </div>

                    {/* Footer - Color Count */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/20">
                      <div className="flex gap-1">
                        {design.colors.slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-3 h-3 border border-border/50 rounded-xs grid-transition group-hover:ring-1 group-hover:ring-offset-1 group-hover:ring-offset-background group-hover:ring-primary/40"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                        {design.colors.length > 4 && <div className="text-xs text-muted-foreground font-mono ml-1">+{design.colors.length - 4}</div>}
                      </div>
                      <span className="text-xs text-muted-foreground font-mono">{design.colors.length} colors</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Details Panel - Desktop Only */}
        <div className="hidden md:flex md:col-span-3 flex-col sticky top-16 h-[calc(100vh-64px)] border-l border-border/20 bg-background/50">
          {selectedDesign && (
            <div className="p-6 space-y-4 overflow-y-auto h-full">
              <button onClick={() => setSelectedDesign(null)} className="text-muted-foreground hover:text-foreground grid-transition p-1 hover:bg-muted/40 rounded-sm self-end">
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-3">
                <h2 className="text-sm font-bold text-foreground line-clamp-2 hover:text-foreground/90 grid-transition">{selectedDesign.title}</h2>
                <a href={selectedDesign.url} target="_blank" rel="noopener noreferrer" className="w-full px-3 py-2 text-xs bg-primary/5 border border-primary/20 rounded-sm font-mono hover:bg-primary/10 hover:border-primary/40 grid-transition flex items-center justify-between group">
                  <span>Visit Site</span>
                  <span className="opacity-0 group-hover:opacity-100">↗</span>
                </a>
              </div>

              <div className="h-px bg-border/20" />

              <div className="space-y-3">
                <h3 className="text-xs uppercase font-mono font-semibold tracking-wider">Colors</h3>
                <div className="space-y-2">
                  {selectedDesign.colors.map((color, i) => (
                    <div key={i} className="group flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-2 rounded-sm grid-transition border border-border/40 hover:border-border/60" onClick={() => handleCopy(color, 'color')}>
                      <div className="w-5 h-5 border border-border rounded-sm grid-transition group-hover:ring-1 group-hover:ring-offset-1 group-hover:ring-offset-background group-hover:ring-primary/40" style={{ backgroundColor: color }} />
                      <code className="text-xs font-mono">{color}</code>
                      {copied ? <Check className="w-4 h-4 ml-auto" /> : <Copy className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100" />}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border/20" />

              <div className="space-y-3">
                <h3 className="text-xs uppercase font-mono font-semibold tracking-wider">Typography</h3>
                <TypographyDisplay fonts={selectedDesign.typography} onCopy={() => null} />
              </div>

              {selectedDesign.tags.length > 0 && (
                <>
                  <div className="h-px bg-border/20" />
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-mono font-semibold tracking-wider">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedDesign.tags.map((tag, i) => (
                        <span key={i} className="text-xs px-2 py-1 bg-muted/40 border border-border/40 rounded-sm font-mono grid-transition hover:bg-muted/60 hover:border-border/60 text-muted-foreground hover:text-foreground/80">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Mobile Details Bottom Sheet */}
        {selectedDesign && (
          <>
            <div className="md:hidden fixed inset-0 bg-black/40 z-30 top-16" onClick={() => setSelectedDesign(null)} role="presentation" aria-hidden="true" />
            <dialog className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/20 rounded-t-xl z-40 max-h-[70vh] overflow-y-auto w-full" open aria-label="Design details">
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-foreground">{selectedDesign.title}</h2>
                  <button onClick={() => setSelectedDesign(null)} className="p-1 hover:bg-muted rounded-sm" aria-label="Close design details">
                    <X className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <a href={selectedDesign.url} target="_blank" rel="noopener noreferrer" className="w-full px-3 py-2.5 text-sm bg-primary/10 border border-primary/30 rounded-sm font-mono hover:bg-primary/20 flex items-center justify-center gap-2">
                  Visit Site ↗
                </a>

                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-mono font-semibold tracking-wider">Colors ({selectedDesign.colors.length})</h3>
                  {selectedDesign.colors.map((color, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border border-border/40 rounded-sm cursor-pointer hover:bg-muted/30" onClick={() => handleCopy(color, 'color')} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleCopy(color, 'color')} aria-label={`Copy color ${color}`}>
                      <div className="w-6 h-6 border border-border rounded-sm" style={{ backgroundColor: color }} aria-hidden="true" />
                      <code className="text-xs font-mono flex-1">{color}</code>
                      {copied ? <Check className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs uppercase font-mono font-semibold tracking-wider">Typography ({selectedDesign.typography.length})</h3>
                  <TypographyDisplay fonts={selectedDesign.typography} onCopy={() => null} />
                </div>
              </div>
            </dialog>
          </>
        )}
      </div>
    </div>
  )
}
