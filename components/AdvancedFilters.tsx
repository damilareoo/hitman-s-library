'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, ChevronDown } from 'lucide-react'

interface FilterOptions {
  industry: string[]
  designStyle: string[]
  layoutType: string[]
  colorPalette: string[]
  complexity: string[]
  useCase: string[]
  animationStyle: string[]
  accessibility: string[]
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

interface AdvancedFiltersProps {
  onFiltersChange: (filters: ActiveFilters) => void
  onClearAll: () => void
}

export default function AdvancedFilters({ onFiltersChange, onClearAll }: AdvancedFiltersProps) {
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
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
  const [expandedSections, setExpandedSections] = useState<string[]>(['industry'])
  const [loading, setLoading] = useState(true)

  // Fetch available filter options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const response = await fetch('/api/design/categories')
        const data = await response.json()
        setFilterOptions(data)
      } catch (error) {
        console.error('Failed to fetch filter options:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOptions()
  }, [])

  // Notify parent when filters change
  useEffect(() => {
    onFiltersChange(activeFilters)
  }, [activeFilters, onFiltersChange])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const toggleFilter = (category: keyof Omit<ActiveFilters, 'search' | 'sortBy'>, value: string) => {
    setActiveFilters(prev => {
      const updated = { ...prev }
      const categoryKey = category as keyof typeof updated
      const currentArray = updated[categoryKey] as string[]

      if (currentArray.includes(value)) {
        updated[categoryKey] = currentArray.filter(v => v !== value) as never
      } else {
        updated[categoryKey] = [...currentArray, value] as never
      }

      return updated
    })
  }

  const handleSearch = (value: string) => {
    setActiveFilters(prev => ({ ...prev, search: value }))
  }

  const handleSortChange = (sortBy: ActiveFilters['sortBy']) => {
    setActiveFilters(prev => ({ ...prev, sortBy }))
  }

  const handleClearAll = () => {
    setActiveFilters({
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
    onClearAll()
  }

  const totalActiveFilters = 
    activeFilters.industries.length +
    activeFilters.styles.length +
    activeFilters.layouts.length +
    activeFilters.colors.length +
    activeFilters.useCases.length +
    activeFilters.animations.length +
    activeFilters.accessibility.length +
    (activeFilters.search ? 1 : 0)

  if (loading) return <div className="p-4 text-xs text-muted-foreground">Loading filters...</div>

  return (
    <div className="space-y-4 border-b border-slate-200 dark:border-slate-800 pb-4">
      {/* Search and Sort */}
      <div className="space-y-3">
        <Input
          placeholder="Search by name, tags, or details..."
          value={activeFilters.search}
          onChange={(e) => handleSearch(e.target.value)}
          className="h-9 font-mono text-xs"
        />
        
        <div className="flex gap-2 flex-wrap">
          <select
            value={activeFilters.sortBy}
            onChange={(e) => handleSortChange(e.target.value as any)}
            className="h-8 px-3 text-xs font-mono border border-slate-200 dark:border-slate-800 rounded bg-background text-foreground grid-transition hover:bg-muted"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="name">By Name</option>
            <option value="quality">By Quality</option>
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {totalActiveFilters > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilters.industries.map(ind => (
            <span key={`ind-${ind}`} className="text-xs px-2.5 py-1 bg-primary/10 border border-primary/30 text-primary rounded-full font-mono flex items-center gap-1.5 grid-transition hover:bg-primary/20">
              {ind}
              <button
                onClick={() => toggleFilter('industries', ind)}
                className="hover:opacity-60 grid-transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeFilters.styles.map(style => (
            <span key={`style-${style}`} className="text-xs px-2.5 py-1 bg-muted border border-border/50 rounded-full font-mono flex items-center gap-1.5 grid-transition hover:bg-muted/80 hover:border-border/70">
              {style}
              <button
                onClick={() => toggleFilter('styles', style)}
                className="hover:opacity-60 grid-transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeFilters.search && (
            <span className="text-xs px-2.5 py-1 bg-muted border border-border/50 rounded-full font-mono flex items-center gap-1.5 grid-transition hover:bg-muted/80">
              🔍 &ldquo;{activeFilters.search}&rdquo;
              <button
                onClick={() => handleSearch('')}
                className="hover:opacity-60 grid-transition"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {totalActiveFilters > 0 && (
            <button
              onClick={handleClearAll}
              className="text-xs px-2.5 py-1 border border-border/50 rounded-full font-mono hover:bg-muted grid-transition"
            >
              Clear ({totalActiveFilters})
            </button>
          )}
        </div>
      )}

      {/* Filter Sections */}
      <div className="space-y-2">
        {filterOptions && (
          <>
            {/* Industry Filter */}
            <FilterSection
              title="Industry"
              options={filterOptions.industry}
              selected={activeFilters.industries}
              onToggle={(value) => toggleFilter('industries', value)}
              expanded={expandedSections.includes('industry')}
              onToggleExpand={() => toggleSection('industry')}
            />

            {/* Design Style Filter */}
            <FilterSection
              title="Design Style"
              options={filterOptions.designStyle}
              selected={activeFilters.styles}
              onToggle={(value) => toggleFilter('styles', value)}
              expanded={expandedSections.includes('style')}
              onToggleExpand={() => toggleSection('style')}
            />

            {/* Layout Type Filter */}
            <FilterSection
              title="Layout Type"
              options={filterOptions.layoutType}
              selected={activeFilters.layouts}
              onToggle={(value) => toggleFilter('layouts', value)}
              expanded={expandedSections.includes('layout')}
              onToggleExpand={() => toggleSection('layout')}
            />

            {/* Color Palette Filter */}
            <FilterSection
              title="Color Palette"
              options={filterOptions.colorPalette}
              selected={activeFilters.colors}
              onToggle={(value) => toggleFilter('colors', value)}
              expanded={expandedSections.includes('color')}
              onToggleExpand={() => toggleSection('color')}
            />

            {/* Use Case Filter */}
            <FilterSection
              title="Use Case"
              options={filterOptions.useCase}
              selected={activeFilters.useCases}
              onToggle={(value) => toggleFilter('useCases', value)}
              expanded={expandedSections.includes('useCase')}
              onToggleExpand={() => toggleSection('useCase')}
            />

            {/* Animation Style Filter */}
            <FilterSection
              title="Animation Style"
              options={filterOptions.animationStyle}
              selected={activeFilters.animations}
              onToggle={(value) => toggleFilter('animations', value)}
              expanded={expandedSections.includes('animation')}
              onToggleExpand={() => toggleSection('animation')}
            />

            {/* Accessibility Filter */}
            <FilterSection
              title="Accessibility"
              options={filterOptions.accessibility}
              selected={activeFilters.accessibility}
              onToggle={(value) => toggleFilter('accessibility', value)}
              expanded={expandedSections.includes('accessibility')}
              onToggleExpand={() => toggleSection('accessibility')}
            />
          </>
        )}
      </div>
    </div>
  )
}

interface FilterSectionProps {
  title: string
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
  expanded: boolean
  onToggleExpand: () => void
}

function FilterSection({ title, options, selected, onToggle, expanded, onToggleExpand }: FilterSectionProps) {
  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3">
      <button
        onClick={onToggleExpand}
        className="flex items-center justify-between w-full text-sm font-mono text-foreground hover:text-foreground/80 grid-transition"
      >
        <span className="font-semibold">{title}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {options.map(option => (
            <label
              key={option}
              className="flex items-center gap-2 text-xs font-mono cursor-pointer hover:text-foreground/80 grid-transition"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="w-3 h-3 rounded border-slate-300 grid-transition"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
