'use client'

import React from "react"
import { useState, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AdminPage() {
  const [linkInput, setLinkInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [fileInputRef, setFileInputRef] = useState<HTMLInputElement | null>(null)

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
        alert(`✓ "${data.title}" added as ${data.industry}`)
        setLinkInput('')
        // Optionally redirect back to gallery
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
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
        alert(`✓ ${data.count} designs imported`)
        setLinkInput('')
        setTimeout(() => {
          window.location.href = '/'
        }, 1500)
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
          <h1 className="text-lg md:text-xl font-bold font-mono">Admin Panel</h1>
          <Link href="/" className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-sm border border-border/40 hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Gallery
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="space-y-8">
          {/* Add Single Site */}
          <div className="border border-border/40 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold font-mono">Add Website</h2>
            <p className="text-sm text-muted-foreground">Enter a website URL to extract design data automatically</p>
            
            <div className="space-y-3">
              <Input 
                placeholder="https://example.com" 
                value={linkInput} 
                onChange={(e) => setLinkInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleAddLink()} 
                disabled={isLoading} 
                className="font-mono text-sm h-10 border-border/50" 
              />
              <Button 
                onClick={handleAddLink} 
                disabled={isLoading || !linkInput.trim()} 
                className="w-full h-10 font-mono"
              >
                {isLoading ? 'Extracting...' : 'Add Design'}
              </Button>
            </div>
          </div>

          {/* Bulk Upload */}
          <div className="border border-border/40 rounded-lg p-6 space-y-4">
            <h2 className="text-lg font-bold font-mono">Bulk Upload</h2>
            <p className="text-sm text-muted-foreground">Upload a CSV or Excel file with multiple websites</p>
            
            <div className="space-y-3">
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
                className="w-full h-10 font-mono"
              >
                {isLoading ? 'Uploading...' : 'Select File'}
              </Button>
            </div>
          </div>

          {/* Info Section */}
          <div className="border border-border/40 rounded-lg p-6 space-y-3 bg-muted/30">
            <h3 className="text-sm font-bold font-mono">Admin Info</h3>
            <ul className="text-xs space-y-2 text-muted-foreground font-mono">
              <li>• Add websites one at a time or import multiple via CSV/Excel</li>
              <li>• Design data is automatically extracted (colors, typography, layout)</li>
              <li>• Duplicates are automatically detected and rejected</li>
              <li>• Designs are categorized by industry</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}
