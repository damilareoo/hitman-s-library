'use client'

import { useState } from 'react'
import { brianLovinSites, inspofeedLinks, inspirationCategories, inspirationByCategory } from '@/lib/inspiration-sources'
import { ExternalLink, Search } from 'lucide-react'

export default function InspirationGallery() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'brian-lovin' | 'inspofeed'>('all')

  const allSources = [
    ...brianLovinSites.map(s => ({ ...s, source: 'Brian Lovin' })),
    ...inspofeedLinks.map(s => ({ ...s, source: 'InspofFeed' }))
  ]

  let filtered = allSources.filter(site => {
    const matchesCategory = !selectedCategory || site.category === selectedCategory
    const matchesSearch = !searchQuery || 
      site.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      site.url.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSource = sourceFilter === 'all' || site.source.includes(sourceFilter === 'brian-lovin' ? 'Brian' : 'InspofFeed')
    
    return matchesCategory && matchesSearch && matchesSource
  })

  const categories = Object.keys(inspirationCategories)
  const uniqueCategories = [...new Set(allSources.map(s => s.category))]

  return (
    <div className="space-y-8 py-8">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-4xl font-bold mb-2">Design Inspiration</h1>
          <p className="text-muted-foreground">
            Curated collection of {allSources.length}+ design sites from Brian Lovin and InspofFeed
          </p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search inspiration sites..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg glass focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Source Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'brian-lovin', 'inspofeed'] as const).map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  sourceFilter === source
                    ? 'bg-primary text-primary-foreground'
                    : 'border glass hover:bg-muted'
                }`}
              >
                {source === 'all' ? 'All Sources' : source === 'brian-lovin' ? 'Brian Lovin' : 'InspofFeed'}
              </button>
            ))}
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2 rounded-lg transition-all ${
                !selectedCategory
                  ? 'bg-primary text-primary-foreground'
                  : 'border glass hover:bg-muted'
              }`}
            >
              All Categories
            </button>
            {uniqueCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'border glass hover:bg-muted'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {allSources.length} sites
      </p>

      {/* Grid */}
      <div className="grid-premium">
        {filtered.map((site, idx) => (
          <a
            key={`${site.url}-${idx}`}
            href={`https://${site.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="premium-card interactive group"
            style={{ animationDelay: `${idx * 50}ms` }}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                    {site.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {site.url}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-2 flex-shrink-0 transition-colors" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                  {site.category}
                </span>
                {site.source && (
                  <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                    {site.source}
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-muted-foreground">No sites found matching your criteria</p>
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory(null)
              setSourceFilter('all')
            }}
            className="text-sm text-primary hover:underline"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  )
}
