'use client'

import React, { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, Upload, Loader, ChevronLeft, ChevronRight, Search } from 'lucide-react'

interface Site {
  id: string
  source_name: string
  source_url: string
  industry: string
  created_at: string
}

const ITEMS_PER_PAGE = 10

export default function AdminPage() {
  const [linkInput, setLinkInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [allSites, setAllSites] = useState<Site[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter sites based on search
  const filteredSites = allSites.filter(site =>
    site.source_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    site.source_url.toLowerCase().includes(searchInput.toLowerCase()) ||
    site.industry.toLowerCase().includes(searchInput.toLowerCase())
  )

  const totalPages = Math.ceil(filteredSites.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedSites = filteredSites.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchInput])

  // Load all sites on mount
  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    setIsLoadingSites(true)
    try {
      const response = await fetch('/api/design/list')
      const data = await response.json()
      const sites = Array.isArray(data) ? data : data.designs || []
      // Transform field names to match interface
      const transformedSites = sites.map((s: any) => ({
        id: s.id,
        source_name: s.title || s.source_name,
        source_url: s.url || s.source_url,
        industry: s.industry || 'Uncategorized',
        created_at: s.addedDate || s.created_at
      }))
      console.log('[v0] Loaded sites:', transformedSites.length)
      setAllSites(transformedSites)
    } catch (error) {
      console.error('[v0] Error loading sites:', error)
    } finally {
      setIsLoadingSites(false)
    }
  }

  // Load sites on component mount
  React.useEffect(() => {
    loadSites()
  }, [])

  const handleAddLink = async () => {
    if (!linkInput.trim()) {
      alert('Please enter a website URL')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/design/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkInput,
          notes: ''
        })
      })

      const data = await response.json()

      if (data.isDuplicate) {
        setSuccessMessage('Already added')
        setTimeout(() => setSuccessMessage(''), 2000)
      } else if (data.success || data.id) {
        setSuccessMessage(`Added "${data.title || 'Site'}"`)
        setTimeout(() => setSuccessMessage(''), 2000)
        setLinkInput('')
        loadSites()
      } else if (data.error) {
        alert(`Error: ${data.error}`)
      } else {
        alert('Failed to add site')
      }
    } catch (error) {
      console.error('[v0] Error adding site:', error)
      alert('Connection error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    setDeletingId(siteId)
    try {
      const response = await fetch('/api/design/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: siteId })
      })

      if (response.ok) {
        setSuccessMessage('Removed')
        setTimeout(() => setSuccessMessage(''), 1500)
        setAllSites(allSites.filter(s => s.id !== siteId))
      } else {
        alert('Failed to delete')
      }
    } catch (error) {
      console.error('[v0] Error deleting site:', error)
      alert('Error deleting site')
    } finally {
      setDeletingId(null)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setIsLoading(true)
    try {
      const response = await fetch('/api/design/upload-csv', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (data.success) {
        setSuccessMessage(`Imported ${data.count} sites`)
        setTimeout(() => setSuccessMessage(''), 2000)
        loadSites()
      } else {
        alert(`Error: ${data.error || 'Upload failed'}`)
      }
    } catch (error) {
      console.error('[v0] Upload error:', error)
      alert('Upload failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-bold font-mono tracking-tight">Hitman's Library</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">{allSites.length} total sites</p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-sm border border-border/40 hover:bg-muted transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Gallery
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Add Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Add URL */}
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase font-mono font-semibold tracking-widest text-muted-foreground block mb-2">Add Site</label>
              <Input
                placeholder="https://example.com"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()}
                disabled={isLoading}
                className="font-mono text-xs h-9"
              />
            </div>
            <Button
              onClick={handleAddLink}
              disabled={isLoading || !linkInput.trim()}
              className="w-full h-9 font-mono text-xs"
            >
              {isLoading ? <Loader className="w-3 h-3 animate-spin mr-2" /> : <Plus className="w-3 h-3 mr-2" />}
              {isLoading ? 'Adding...' : 'Add Site'}
            </Button>
          </div>

          {/* Import CSV */}
          <div className="space-y-3">
            <div>
              <label className="text-xs uppercase font-mono font-semibold tracking-widest text-muted-foreground block mb-2">Import CSV/Excel</label>
              <input
                ref={(ref) => setFileInputRef(ref)}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef?.click()}
                variant="outline"
                disabled={isLoading}
                className="w-full h-9 font-mono text-xs"
              >
                <Upload className="w-3 h-3 mr-2" />
                {isLoading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-sm">
              <div className="w-2 h-2 rounded-full bg-green-600" />
              <span className="text-xs font-mono text-green-700 flex-1">{successMessage}</span>
            </div>
          )}
        </div>

        {/* Search and Info */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b border-border/20">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search sites..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 font-mono text-xs h-9"
            />
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {isLoadingSites ? 'Loading...' : `Showing ${paginatedSites.length} of ${filteredSites.length}`}
          </div>
        </div>

        {/* Sites Table */}
        {isLoadingSites ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : paginatedSites.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground font-mono">No sites found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginatedSites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between gap-4 p-4 border border-border/40 rounded-sm hover:bg-muted/30 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-mono font-semibold truncate">{site.source_name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted border border-border/40 font-mono text-muted-foreground flex-shrink-0">
                        {site.industry}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">{site.source_url}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {new Date(site.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(site.id)}
                    disabled={deletingId === site.id}
                    className="p-2 hover:bg-red-500/10 rounded-sm border border-red-500/30 hover:border-red-500/60 transition-colors flex-shrink-0 group-hover:opacity-100 opacity-0"
                    aria-label="Delete site"
                  >
                    {deletingId === site.id ? (
                      <Loader className="w-4 h-4 animate-spin text-red-600" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-600 hover:text-red-700" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border/20">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 hover:bg-muted rounded-sm border border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="text-xs font-mono text-muted-foreground">
                  {currentPage} / {totalPages}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 hover:bg-muted rounded-sm border border-border/40 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
