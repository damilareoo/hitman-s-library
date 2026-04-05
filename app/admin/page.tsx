'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, MagnifyingGlass, Trash, CircleNotch, ArrowCounterClockwise } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'motion/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { useSoundsContext } from '@/contexts/sounds-context'

interface Site {
  id: string
  source_name: string
  source_url: string
  industry: string
  created_at: string
  thumbnail_url?: string
  screenshot_url?: string
  mobile_screenshot_url?: string | null
  figma_capture_url?: string | null
  extraction_error?: string | null
}

interface QueueItem {
  url: string
  status: 'pending' | 'processing' | 'done' | 'error'
  message: string | null
}

const STAGES = [
  { label: 'Launching browser…', delay: 0 },
  { label: 'Rendering page…', delay: 3000 },
  { label: 'Extracting colors…', delay: 8000 },
  { label: 'Capturing screenshot…', delay: 15000 },
  { label: 'Saving…', delay: 25000 },
]

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

function SiteStatus({ site }: { site: Site }) {
  if (site.screenshot_url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-label="Status: In gallery" />
        In gallery
      </span>
    )
  }
  if (site.extraction_error) {
    const info = classifyExtractionError(site.extraction_error)
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400" title={info.explanation}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-label={`Status: ${info.label}`} />
        {info.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" aria-label="Status: Pending" />
      Pending
    </span>
  )
}

function PasscodeGate({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!value.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: value }),
      })
      if (res.ok) {
        sessionStorage.setItem('admin_auth', '1')
        onAuth()
      } else {
        setError('Incorrect passcode.')
        setValue('')
      }
    } catch {
      setError('Connection error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="w-full max-w-xs space-y-4 px-6">
        <div className="space-y-1">
          <h1 className="text-[15px] font-medium tracking-[-0.01em]">Admin</h1>
          <p className="text-[12px] font-mono text-muted-foreground">Enter passcode to continue.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Passcode"
            value={value}
            onChange={e => { setValue(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
            className="flex-1 h-9 px-3 text-[13px] font-mono bg-muted border border-border/60 rounded-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/50"
          />
          <button
            onClick={submit}
            disabled={loading || !value.trim()}
            className="h-9 px-4 text-[12px] font-medium bg-foreground text-background rounded-sm disabled:opacity-40 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
          >
            {loading ? '···' : 'Enter →'}
          </button>
        </div>
        {error && (
          <p className="text-[12px] font-mono text-destructive">{error}</p>
        )}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [linkInput, setLinkInput] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [addStage, setAddStage] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [allSites, setAllSites] = useState<Site[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeduping, setIsDeduping] = useState(false)
  const [dedupResult, setDedupResult] = useState<string | null>(null)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null)
  const [isFigmaBackfilling, setIsFigmaBackfilling] = useState(false)
  const [figmaBackfillProgress, setFigmaBackfillProgress] = useState<{ done: number; total: number } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([])
  const addInputRef = useRef<HTMLInputElement>(null)
  const sounds = useSoundsContext()
  const [bulkInput, setBulkInput] = useState('')
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [isRunningQueue, setIsRunningQueue] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const ITEMS = 20

  useEffect(() => {
    const ok = sessionStorage.getItem('admin_auth') === '1'
    setAuthed(ok)
    setAuthChecked(true)
  }, [])

  const filtered = allSites.filter(s =>
    !searchInput ||
    s.source_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    s.source_url.toLowerCase().includes(searchInput.toLowerCase()) ||
    s.industry.toLowerCase().includes(searchInput.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / ITEMS)
  const paginated = filtered.slice((currentPage - 1) * ITEMS, currentPage * ITEMS)

  useEffect(() => { setCurrentPage(1) }, [searchInput])

  useEffect(() => { loadSites() }, [])

  function clearTimers() {
    stageTimers.current.forEach(clearTimeout)
    stageTimers.current = []
  }

  const loadSites = async () => {
    setIsLoadingSites(true)
    try {
      const res = await fetch('/api/design/list')
      const data = await res.json()
      const raw = Array.isArray(data) ? data : data.designs || []
      setAllSites(raw.map((s: any) => ({
        id: String(s.id),
        source_name: s.title || s.source_name || 'Untitled',
        source_url: s.url || s.source_url,
        industry: s.industry || 'Uncategorized',
        created_at: s.addedDate || s.created_at,
        thumbnail_url: s.thumbnail_url,
        screenshot_url: s.screenshot_url,
        mobile_screenshot_url: s.mobile_screenshot_url ?? null,
        figma_capture_url: s.figma_capture_url ?? null,
        extraction_error: s.extraction_error ?? s.metadata?.extraction_error ?? null,
      })))
    } catch (e) {
      console.error('[admin] load error', e)
    } finally {
      setIsLoadingSites(false)
    }
  }

  const handleAdd = async () => {
    if (!linkInput.trim() || isAdding) return
    setIsAdding(true)
    setAddError(null)
    setAddStage(null)
    setAddedId(null)
    clearTimers()

    STAGES.forEach(({ label, delay }) => {
      const t = setTimeout(() => setAddStage(label), delay)
      stageTimers.current.push(t)
    })

    try {
      const res = await fetch('/api/design/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput, notes: '' }),
      })
      const data = await res.json()
      clearTimers()
      setAddStage(null)

      if (data.isDuplicate) {
        setAddError('Already in your collection.')
      } else if (data.success || data.id) {
        sounds.playSuccess()
        setAddedId(String(data.id))
        setLinkInput('')
        await loadSites()
      } else if (data.error) {
        const info = classifyExtractionError(data.error)
        setAddError(info.explanation)
      } else {
        setAddError('Failed to add. Try another URL.')
      }
    } catch {
      clearTimers()
      setAddStage(null)
      setAddError('Connection error. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (siteId: string) => {
    if (!confirm('Remove this site from your collection?')) return
    setDeletingId(siteId)
    try {
      const res = await fetch('/api/design/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: siteId }),
      })
      if (res.ok) {
        setAllSites(prev => prev.filter(s => s.id !== siteId))
        if (addedId === siteId) setAddedId(null)
      }
    } catch (e) {
      console.error('[admin] delete error', e)
    } finally {
      setDeletingId(null)
    }
  }

  const processQueue = async (items: QueueItem[]) => {
    setIsRunningQueue(true)
    for (let i = 0; i < items.length; i++) {
      setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'processing' } : q))
      try {
        const res = await fetch('/api/design/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: items[i].url, notes: '' }),
        })
        const data = await res.json()
        if (data.isDuplicate) {
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', message: 'Already in collection' } : q))
        } else if (data.success || data.id) {
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', message: 'Added' } : q))
        } else {
          const msg = data.error ? classifyExtractionError(data.error).label : 'Failed'
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', message: msg } : q))
        }
      } catch {
        setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'error', message: 'Connection error' } : q))
      }
      if (i < items.length - 1) await new Promise(r => setTimeout(r, 500))
    }
    setIsRunningQueue(false)
    await loadSites()
  }

  const handleBulkSubmit = () => {
    const urls = bulkInput
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0)
    if (!urls.length || isRunningQueue) return
    const items: QueueItem[] = urls.map(url => ({ url, status: 'pending', message: null }))
    setQueue(items)
    setBulkInput('')
    processQueue(items)
  }

  const handleDeduplicate = async () => {
    if (!confirm('This will remove duplicate entries, keeping the best version of each site. Continue?')) return
    setIsDeduping(true)
    setDedupResult(null)
    try {
      const res = await fetch('/api/admin/deduplicate', { method: 'POST' })
      const data = await res.json()
      if (data.deleted === 0) {
        setDedupResult('No duplicates found.')
      } else {
        setDedupResult(`Removed ${data.deleted} duplicate${data.deleted === 1 ? '' : 's'}.`)
        await loadSites()
      }
    } catch {
      setDedupResult('Failed to deduplicate.')
    } finally {
      setIsDeduping(false)
    }
  }

  const handleBackfillMobile = async () => {
    const missing = allSites.filter(s => s.screenshot_url && !s.mobile_screenshot_url)
    if (!missing.length) return alert('All sites already have mobile screenshots.')
    if (!confirm(`Capture mobile screenshots for ${missing.length} sites? This will take a while.`)) return

    setIsBackfilling(true)
    setBackfillProgress({ done: 0, total: missing.length })

    for (let i = 0; i < missing.length; i++) {
      try {
        await fetch('/api/admin/mobile-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: missing[i].id }),
        })
      } catch { /* continue on individual failures */ }
      setBackfillProgress({ done: i + 1, total: missing.length })
    }

    setIsBackfilling(false)
    setBackfillProgress(null)
    await loadSites()
  }

  const handleFigmaBackfill = async () => {
    const missing = allSites.filter(s => s.screenshot_url && !s.figma_capture_url)
    if (!missing.length) return alert('All sites already have Figma capture data.')
    if (!confirm(`Capture Figma layers for ${missing.length} sites? Each takes ~15s.`)) return

    setIsFigmaBackfilling(true)
    setFigmaBackfillProgress({ done: 0, total: missing.length })

    for (let i = 0; i < missing.length; i++) {
      try {
        await fetch('/api/admin/figma-backfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: missing[i].id }),
        })
      } catch { /* continue on failures */ }
      setFigmaBackfillProgress({ done: i + 1, total: missing.length })
    }

    setIsFigmaBackfilling(false)
    setFigmaBackfillProgress(null)
    await loadSites()
  }

  const inGallery = allSites.filter(s => s.screenshot_url).length
  const failed = allSites.filter(s => !s.screenshot_url && s.extraction_error).length

  if (!authChecked) return null
  if (!authed) return <PasscodeGate onAuth={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-medium tracking-[-0.01em]">Hitman's Library</h1>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-[3px]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/changelog"
              className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Changelog
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
              Gallery
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 md:px-7 py-8 space-y-8">

        {/* Bulk add */}
        <div className="space-y-3">
          <button
            onClick={() => setBulkOpen(p => !p)}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{bulkOpen ? '▾' : '▸'}</span> Bulk Add
          </button>

          {bulkOpen && (
            <div className="space-y-2">
              <textarea
                placeholder={"https://stripe.com\nhttps://linear.app\nhttps://vercel.com"}
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                disabled={isRunningQueue}
                rows={4}
                className="w-full px-3 py-2 text-[12px] font-mono bg-muted border border-border/60 rounded-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/40 disabled:opacity-60 resize-none"
              />
              <button
                onClick={handleBulkSubmit}
                disabled={isRunningQueue || !bulkInput.trim()}
                className="h-9 px-4 text-[12px] font-medium bg-foreground text-background rounded-sm disabled:opacity-40 hover:opacity-85 transition-opacity"
              >
                {isRunningQueue ? 'Processing…' : `Add ${bulkInput.split('\n').filter(u => u.trim()).length} URLs →`}
              </button>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-px">
              {queue.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-[3px]">
                  <span className="shrink-0">
                    {item.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 inline-block" />}
                    {item.status === 'processing' && <CircleNotch className="w-3 h-3 animate-spin text-muted-foreground" weight="bold" />}
                    {item.status === 'done' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                    {item.status === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                  </span>
                  <span className="text-[12px] font-mono text-muted-foreground truncate flex-1">{getDomain(item.url)}</span>
                  {item.message && (
                    <span className="text-[11px] font-mono text-muted-foreground/50 shrink-0">{item.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add site */}
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.12em] font-medium text-muted-foreground">
            Add Site
          </p>
          <div className="flex gap-2">
            <input
              ref={addInputRef}
              type="url"
              placeholder="https://example.com"
              value={linkInput}
              onChange={e => { setLinkInput(e.target.value); setAddError(null) }}
              onKeyDown={e => e.key === 'Enter' && !isAdding && handleAdd()}
              disabled={isAdding}
              className="flex-1 h-9 px-3 text-[13px] font-mono bg-muted border border-border/60 rounded-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/50 disabled:opacity-60"
            />
            <button
              onClick={handleAdd}
              disabled={isAdding || !linkInput.trim()}
              className="h-9 px-4 text-[12px] font-medium bg-foreground text-background rounded-sm disabled:opacity-40 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
            >
              {isAdding ? '···' : 'Add →'}
            </button>
          </div>

          {/* Stage indicator */}
          <AnimatePresence mode="wait">
            {isAdding && addStage && (
              <motion.div
                key={addStage}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-2"
              >
                <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin text-muted-foreground flex-shrink-0" />
                <span className="text-[12px] font-mono text-muted-foreground">{addStage}</span>
              </motion.div>
            )}
            {addError && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] font-mono text-destructive"
              >
                {addError}
              </motion.p>
            )}
            {addedId && !isAdding && (
              <motion.p
                key="success"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[12px] font-mono text-emerald-600 dark:text-emerald-400"
              >
                ✓ Site added successfully
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 py-3 border-y border-border/40">
          <div>
            <p className="text-[22px] font-medium tabular-nums tracking-[-0.02em]">{allSites.length}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Total sites</p>
          </div>
          <div className="w-px h-8 bg-border/40" />
          <div>
            <p className="text-[22px] font-medium tabular-nums tracking-[-0.02em] text-emerald-600 dark:text-emerald-400">{inGallery}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">In gallery</p>
          </div>
          <div className="w-px h-8 bg-border/40" />
          <div>
            <p className="text-[22px] font-medium tabular-nums tracking-[-0.02em] text-amber-600 dark:text-amber-400">{failed}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">Failed</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {dedupResult && (
              <span className="text-[12px] font-mono text-muted-foreground">{dedupResult}</span>
            )}
            <button
              onClick={handleDeduplicate}
              disabled={isDeduping}
              className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isDeduping
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> Deduplicating…</>
                : <><ArrowCounterClockwise className="w-3 h-3" weight="regular" /> Remove duplicates</>
              }
            </button>
            <button
              onClick={handleBackfillMobile}
              disabled={isBackfilling}
              className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isBackfilling
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {backfillProgress?.done}/{backfillProgress?.total}</>
                : 'Backfill mobile'
              }
            </button>
            <button
              onClick={handleFigmaBackfill}
              disabled={isFigmaBackfilling}
              className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isFigmaBackfilling
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {figmaBackfillProgress?.done}/{figmaBackfillProgress?.total}</>
                : 'Backfill Figma'
              }
            </button>
          </div>
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" weight="regular" />
            <input
              type="text"
              placeholder="Search sites…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-[13px] font-mono bg-muted border border-border/60 rounded-sm outline-none focus:border-foreground/40 transition-colors placeholder:text-muted-foreground/50"
            />
          </div>
          <span className="text-[12px] font-mono text-muted-foreground">
            {isLoadingSites ? '…' : `${filtered.length} sites`}
          </span>
        </div>

        {/* Site list */}
        {isLoadingSites ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="w-4 h-4 animate-spin text-muted-foreground" weight="bold" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] font-mono text-muted-foreground">No sites found.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {paginated.map(site => (
              <motion.div
                key={site.id}
                layout
                initial={addedId === site.id ? { opacity: 0, y: -8 } : false}
                animate={{ opacity: 1, y: 0 }}
                className={"group flex items-center gap-4 px-3 py-3 rounded-[3px] transition-colors " + (addedId === site.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-muted/40 border border-transparent')}
              >
                {/* Thumbnail */}
                <div className="w-12 h-8 rounded-[2px] bg-muted border border-border/40 overflow-hidden shrink-0">
                  {(site.thumbnail_url || site.screenshot_url) ? (
                    <img
                      src={site.thumbnail_url || site.screenshot_url}
                      alt={site.source_name}
                      className="w-full h-full object-cover object-top"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[13px] font-medium truncate tracking-[-0.01em]">
                      {site.source_name}
                    </p>
                    <span className="text-[10px] font-mono text-muted-foreground border border-border/50 px-1.5 py-0.5 rounded-[2px] shrink-0">
                      {site.industry}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate mt-0.5">
                    {getDomain(site.source_url)}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0 hidden sm:block">
                  <SiteStatus site={site} />
                </div>

                {/* Date */}
                <p className="text-[11px] font-mono text-muted-foreground shrink-0 hidden md:block">
                  {site.created_at ? new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                </p>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(site.id)}
                  disabled={deletingId === site.id}
                  className="w-7 h-7 flex items-center justify-center rounded-[3px] border border-transparent opacity-0 group-hover:opacity-100 hover:border-destructive/40 hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-all disabled:opacity-50 shrink-0"
                  title="Remove"
                >
                  {deletingId === site.id
                    ? <CircleNotch className="w-3 h-3 animate-spin" weight="bold" />
                    : <Trash className="w-3 h-3" weight="regular" />}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/40">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              ←
            </button>
            <span className="text-[12px] font-mono text-muted-foreground tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-[12px] font-mono border border-border/60 rounded-sm disabled:opacity-40 hover:bg-muted transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
