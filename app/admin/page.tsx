'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Trash2, Plus, Loader } from 'lucide-react'

interface Site {
  id: string
  title: string
  url: string
  industry: string
  created_at: string
}

export default function AdminPage() {
  const [linkInput, setLinkInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [sites, setSites] = useState<Site[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)
  const [successMessage, setSuccessMessage] = useState('')

  // Load all sites on mount
  useEffect(() => {
    loadSites()
  }, [])

  const loadSites = async () => {
    setIsLoadingSites(true)
    try {
      const response = await fetch('/api/design/list?limit=100&offset=0')
      const data = await response.json()
      setSites(data.designs || [])
    } catch (error) {
      console.error('[v0] Error loading sites:', error)
    } finally {
      setIsLoadingSites(false)
    }
  }

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
        alert('⚠ Already Added\n\nThis website is already in your collection')
      } else if (data.success || data.id) {
        setSuccessMessage(`✓ "${data.title}" added`)
        setTimeout(() => setSuccessMessage(''), 3000)
        setLinkInput('')
        loadSites() // Refresh sites seamlessly
      } else if (data.error) {
        alert(`⚠ ${data.error}\n\n${data.warning || 'Try another website'}`)
      } else {
        alert('Failed to add design. Please try another website.')
      }
    } catch (error) {
      console.error('[v0] Error adding design:', error)
      alert('Connection error. Please check your internet and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    if (!confirm('Remove this site from the collection?')) return

    setDeletingId(siteId)
    try {
      const response = await fetch('/api/design/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: siteId })
      })

      if (response.ok) {
        setSuccessMessage('✓ Site removed')
        setTimeout(() => setSuccessMessage(''), 2000)
        setSites(sites.filter(s => s.id !== siteId)) // Update seamlessly
      } else {
        alert('Failed to delete site')
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
        setSuccessMessage(`✓ ${data.count} designs imported`)
        setTimeout(() => setSuccessMessage(''), 3000)
        loadSites() // Refresh sites seamlessly
      } else {
        alert(`⚠ ${data.error || 'Upload failed'}`)
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
      <header className="sticky top-0 z-50 border-b border-border/20 bg-background">
        <div className="h-16 px-4 md:px-6 lg:px-8 flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-xl font-bold font-mono">Admin CMS</h1>
            <p className="text-xs text-muted-foreground font-mono">{sites.length} sites</p>
          </div>
          <Link href="/" className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-sm border border-border/40 hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </Link>
        </div>
      </header>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-4 right-4 z-40 bg-foreground text-background px-4 py-3 rounded-sm font-mono text-sm animate-in fade-in slide-in-from-top-2 duration-300">
          {successMessage}
        </div>
      )}

      {/* Main Content */}
      <main className="p-4 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Add New Site Section */}
          <div className="border border-border/40 rounded-lg p-6 space-y-4 bg-muted/20">
            <h2 className="text-lg font-bold font-mono flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Site
            </h2>
            
            <div className="flex gap-3 flex-col sm:flex-row">
              <Input 
                placeholder="https://example.com" 
                value={linkInput} 
                onChange={(e) => setLinkInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()} 
                disabled={isLoading} 
                className="font-mono text-sm h-10 border-border/50 flex-1" 
              />
              <Button 
                onClick={handleAddLink} 
                disabled={isLoading || !linkInput.trim()} 
                className="h-10 font-mono"
              >
                {isLoading ? 'Adding...' : 'Add'}
              </Button>
            </div>

            <div className="flex gap-2 pt-2">
              <input 
                ref={(ref) => setFileInputRef(ref)} 
                type="file" 
                accept=".xlsx,.csv" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <Button 
                onClick={() => fileInputRef?.click()} 
                disabled={isLoading} 
                variant="outline"
                className="h-9 text-xs font-mono"
              >
                {isLoading ? 'Uploading...' : 'Bulk Import CSV'}
              </Button>
              <span className="text-xs text-muted-foreground font-mono self-center">or paste a CSV file</span>
            </div>
          </div>

          {/* Sites Table */}
          <div className="border border-border/40 rounded-lg overflow-hidden">
            <div className="bg-muted/50 border-b border-border/40 p-4">
              <h2 className="font-bold font-mono text-sm">Sites ({sites.length}/100)</h2>
            </div>

            {isLoadingSites ? (
              <div className="flex items-center justify-center p-12">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : sites.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground font-mono text-sm">
                No sites added yet. Add your first site above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="border-b border-border/20 bg-muted/30">
                      <th className="text-left p-4 font-bold">Title</th>
                      <th className="text-left p-4 font-bold">Industry</th>
                      <th className="text-left p-4 font-bold">URL</th>
                      <th className="text-left p-4 font-bold">Added</th>
                      <th className="text-right p-4 font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sites.map((site) => (
                      <tr key={site.id} className="border-b border-border/20 hover:bg-muted/40 transition-colors">
                        <td className="p-4 max-w-xs truncate">{site.title}</td>
                        <td className="p-4 text-xs">{site.industry}</td>
                        <td className="p-4 max-w-xs truncate text-muted-foreground">
                          <a href={site.url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                            {site.url.replace(/^https?:\/\//, '').split('/')[0]}
                          </a>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(site.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDelete(site.id)}
                            disabled={deletingId === site.id}
                            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === site.id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="border border-border/40 rounded-lg p-6 space-y-3 bg-muted/20">
            <h3 className="text-sm font-bold font-mono">Admin Features</h3>
            <ul className="text-xs space-y-2 text-muted-foreground font-mono">
              <li>• Add websites one at a time or bulk import via CSV/Excel</li>
              <li>• View all {sites.length}/100 sites in a seamless table</li>
              <li>• Delete sites with instant updates (no page refresh needed)</li>
              <li>• Design data auto-extracted (colors, typography, layout)</li>
              <li>• Duplicates automatically detected and rejected</li>
              <li>• Sites categorized by industry</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
