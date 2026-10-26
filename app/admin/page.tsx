'use client'

import React, { useState, useEffect, useRef } from 'react'
import { AdminRequests } from '@/components/admin-requests'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, MagnifyingGlass, Trash, CircleNotch, ArrowCounterClockwise, ImageSquare, Check } from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'motion/react'
import { classifyExtractionError } from '@/lib/classify-extraction-error'
import { useSoundsContext } from '@/contexts/sounds-context'
import { KINDS, UNSORTED, type Kind } from '@/lib/categories'

interface Site {
  id: string
  source_name: string
  source_url: string
  kind: string
  created_at: string
  thumbnail_url?: string
  screenshot_url?: string
  mobile_screenshot_url?: string | null
  extraction_error?: string | null
  /** Rows written at extraction time. Zero means the site is incomplete. */
  color_count?: number
  type_count?: number
}

interface QueueItem {
  url: string
  status: 'pending' | 'processing' | 'done' | 'error'
  message: string | null
}

type AddedFilter = 'all' | 'today' | '7' | '30' | '90' | 'older-90'
type DateSort = 'newest' | 'oldest'
type KindFilter = 'all' | Kind | typeof UNSORTED

const DAY_MS = 24 * 60 * 60 * 1000
const ADDED_FILTERS: { value: AddedFilter; label: string }[] = [
  { value: 'all', label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'older-90', label: '90+ days' },
]

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

/**
 * Anything outside the fixed taxonomy is treated as unsorted, not as a kind.
 * The sidebar only renders KINDS + Unsorted, so a legacy value like "Product"
 * would otherwise leave the row visible in the admin and nowhere else.
 */
function adminKindValue(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return UNSORTED
  return (KINDS as readonly string[]).includes(raw) ? raw : UNSORTED
}

function getCreatedTime(createdAt: string) {
  const time = new Date(createdAt).getTime()
  return Number.isFinite(time) ? time : null
}

function getAgeInDays(createdAt: string) {
  const time = getCreatedTime(createdAt)
  if (time === null) return null
  return Math.max(0, Math.floor((Date.now() - time) / DAY_MS))
}

function matchesAddedFilter(site: Site, filter: AddedFilter) {
  if (filter === 'all') return true
  const days = getAgeInDays(site.created_at)
  if (days === null) return false

  if (filter === 'today') return days === 0
  if (filter === 'older-90') return days > 90
  return days <= Number(filter)
}

function formatAge(createdAt: string) {
  const days = getAgeInDays(createdAt)
  if (days === null) return 'Unknown age'
  if (days === 0) return 'Today'
  if (days === 1) return '1d old'
  return `${days}d old`
}

function SiteStatus({ site }: { site: Site }) {
  if (site.screenshot_url) {
    return (
      <span className="inline-flex items-center gap-1.5 text-meta text-emerald-600 dark:text-emerald-400">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" aria-label="Status: In gallery" />
        In gallery
      </span>
    )
  }
  if (site.extraction_error) {
    const info = classifyExtractionError(site.extraction_error)
    return (
      <span className="inline-flex items-center gap-1.5 text-meta text-amber-600 dark:text-amber-400" title={info.explanation}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" aria-label={`Status: ${info.label}`} />
        {info.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-meta text-ink-3">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-4 shrink-0" aria-label="Status: No preview" />
      No preview
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
        // Session lives in an httpOnly cookie set by the server.
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
          <h1 className="text-titletext">Admin</h1>
          <p className="text-ui text-ink-3">Enter passcode to continue.</p>
        </div>
        <div className="flex gap-2">
          <input
            type="password"
            placeholder="Passcode"
            value={value}
            onChange={e => { setValue(e.target.value); setError(null) }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            autoFocus
            className="flex-1 h-9 px-3 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors placeholder:text-ink-3"
          />
          <button
            onClick={submit}
            disabled={loading || !value.trim()}
            className="h-9 px-4 text-bodytext font-medium bg-foreground text-background rounded-[4px] disabled:opacity-40 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
          >
            {loading ? '···' : 'Enter →'}
          </button>
        </div>
        {error && (
          <p className="text-ui text-destructive">{error}</p>
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
  const [addedFilter, setAddedFilter] = useState<AddedFilter>('all')
  const [dateSort, setDateSort] = useState<DateSort>('newest')
  const [isAdding, setIsAdding] = useState(false)
  const [addStage, setAddStage] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [addedId, setAddedId] = useState<string | null>(null)
  const [addedKind, setAddedKind] = useState<string | null>(null)
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [allSites, setAllSites] = useState<Site[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeduping, setIsDeduping] = useState(false)
  const [dedupResult, setDedupResult] = useState<string | null>(null)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState<{ done: number; total: number } | null>(null)
  const [isPreviewBackfilling, setIsPreviewBackfilling] = useState(false)
  const [previewBackfillProgress, setPreviewBackfillProgress] = useState<{ done: number; total: number } | null>(null)
  const [isDataBackfilling, setIsDataBackfilling] = useState(false)
  const [dataBackfillProgress, setDataBackfillProgress] = useState<{ done: number; total: number } | null>(null)
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [savingKindId, setSavingKindId] = useState<string | null>(null)
  const [kindError, setKindError] = useState<string | null>(null)
  const [isFilingUnsorted, setIsFilingUnsorted] = useState(false)
  const [fileResult, setFileResult] = useState<string | null>(null)
  const [overrideKind, setOverrideKind] = useState<Kind | ''>('')
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
    // The gate is enforced server-side; this only restores UI state from the
    // signed session cookie, which the client cannot forge.
    fetch('/api/admin/auth')
      .then(r => r.json())
      .then(d => setAuthed(Boolean(d.authed)))
      .catch(() => setAuthed(false))
      .finally(() => setAuthChecked(true))
  }, [])

  const kindCounts = allSites.reduce<Record<string, number>>((acc, site) => {
    acc[site.kind] = (acc[site.kind] ?? 0) + 1
    return acc
  }, {})
  const unsortedCount = kindCounts[UNSORTED] ?? 0
  const filedCount = allSites.length - unsortedCount

  const searchedSites = allSites.filter(s =>
    !searchInput ||
    s.source_name.toLowerCase().includes(searchInput.toLowerCase()) ||
    s.source_url.toLowerCase().includes(searchInput.toLowerCase()) ||
    s.kind.toLowerCase().includes(searchInput.toLowerCase())
  )
  const filtered = searchedSites.filter(site =>
    matchesAddedFilter(site, addedFilter) &&
    (kindFilter === 'all' || site.kind === kindFilter)
  )
  const sortedSites = [...filtered].sort((a, b) => {
    const aTime = getCreatedTime(a.created_at)
    const bTime = getCreatedTime(b.created_at)

    if (aTime === null && bTime === null) return 0
    if (aTime === null) return 1
    if (bTime === null) return -1

    return dateSort === 'newest' ? bTime - aTime : aTime - bTime
  })
  const totalPages = Math.ceil(sortedSites.length / ITEMS)
  const paginated = sortedSites.slice((currentPage - 1) * ITEMS, currentPage * ITEMS)

  useEffect(() => { setCurrentPage(1) }, [searchInput, addedFilter, dateSort, kindFilter])

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
        kind: adminKindValue(s.kind),
        created_at: s.addedDate || s.created_at,
        thumbnail_url: s.thumbnail_url,
        screenshot_url: s.screenshot_url,
        mobile_screenshot_url: s.mobile_screenshot_url ?? null,
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
    setAddedKind(null)
    clearTimers()

    STAGES.forEach(({ label, delay }) => {
      const t = setTimeout(() => setAddStage(label), delay)
      stageTimers.current.push(t)
    })

    try {
      const res = await fetch('/api/design/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkInput, notes: '', ...(overrideKind ? { kind: overrideKind } : {}) }),
      })
      const data = await res.json()
      clearTimers()
      setAddStage(null)

      if (data.isDuplicate) {
        setAddError('Already in your collection.')
      } else if (data.success || data.id) {
        sounds.playSuccess()
        setAddedId(String(data.id))
        setAddedKind(typeof data.kind === 'string' ? data.kind : null)
        setLinkInput('')
        setAddError(data.warning ?? null)
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
      setAddError('The add timed out or the server could not be reached. Try again — a slow page can take up to a minute.')
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
          setQueue(prev => prev.map((q, idx) => idx === i ? { ...q, status: 'done', message: typeof data.kind === 'string' ? `Added · ${data.kind}` : 'Added' } : q))
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

  const handleKindChange = async (siteId: string, kind: Kind) => {
    const previous = allSites.find(s => s.id === siteId)?.kind
    if (previous === kind) return
    setKindError(null)
    setSavingKindId(siteId)
    // Optimistic: the row moves under its new filter immediately; a failure
    // puts the old value back and says so, rather than silently diverging.
    setAllSites(prev => prev.map(s => s.id === siteId ? { ...s, kind } : s))
    try {
      const res = await fetch(`/api/design/${siteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch {
      setAllSites(prev => prev.map(s => s.id === siteId ? { ...s, kind: previous ?? UNSORTED } : s))
      setKindError('Could not save that kind. Try again.')
    } finally {
      setSavingKindId(null)
    }
  }

  const handleFileUnsorted = async () => {
    if (isFilingUnsorted || unsortedCount === 0) return
    setIsFilingUnsorted(true)
    setFileResult(null)
    setKindError(null)
    try {
      const res = await fetch('/api/admin/kinds', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      const filed = Number(data.filed) || 0
      const remaining = Number(data.remaining) || 0
      setFileResult(
        remaining === 0
          ? `Filed ${filed} ${filed === 1 ? 'site' : 'sites'} — nothing left unsorted.`
          : `Filed ${filed}; ${remaining} still unsorted.`
      )
      await loadSites()
    } catch {
      setFileResult('Could not file the unsorted sites. Try again.')
    } finally {
      setIsFilingUnsorted(false)
    }
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

  const handleBackfillPreviews = async () => {
    const missing = allSites.filter(s => !s.screenshot_url)
    if (!missing.length) return alert('All sites already have previews.')
    if (!confirm(`Capture previews for ${missing.length} sites? This can take a while.`)) return

    setIsPreviewBackfilling(true)
    setPreviewBackfillProgress({ done: 0, total: missing.length })

    for (let i = 0; i < missing.length; i++) {
      try {
        await fetch('/api/admin/preview-capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: missing[i].id }),
        })
      } catch { /* continue on individual failures */ }
      setPreviewBackfillProgress({ done: i + 1, total: missing.length })
    }

    setIsPreviewBackfilling(false)
    setPreviewBackfillProgress(null)
    await loadSites()
  }

  /**
   * Re-extract every site that has no palette or no type. These are the rows
   * whose browser extraction failed at add time and fell back to an og:image;
   * the full re-extraction is what fills both tabs.
   */
  const handleBackfillData = async () => {
    const missing = allSites.filter(s => !s.color_count || !s.type_count)
    if (!missing.length) return alert('Every site has colours and type.')
    if (!confirm(`Re-extract ${missing.length} sites missing colours or type? Each takes up to a minute.`)) return

    setIsDataBackfilling(true)
    setDataBackfillProgress({ done: 0, total: missing.length })

    for (let i = 0; i < missing.length; i++) {
      try {
        await fetch(`/api/design/${missing[i].id}/reextract`, { method: 'POST' })
      } catch { /* continue on individual failures */ }
      setDataBackfillProgress({ done: i + 1, total: missing.length })
    }

    setIsDataBackfilling(false)
    setDataBackfillProgress(null)
    await loadSites()
  }

  const inGallery = allSites.filter(s => s.screenshot_url).length
  const failed = allSites.filter(s => !s.screenshot_url && s.extraction_error).length

  if (!authChecked) return null
  if (!authed) return <PasscodeGate onAuth={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-edge-strong bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-titletext">Hitman's Library</h1>
            <span className="text-micro text-ink-3 border border-edge-strong px-1.5 py-0.5 rounded-[4px]">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/changelog"
              className="flex items-center gap-1.5 text-ui text-ink-3 hover:text-foreground transition-colors"
            >
              Changelog
            </Link>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-ui text-ink-3 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
              Gallery
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 md:px-7 py-8 space-y-8">

        {/* Requests — public submissions waiting on a decision. Above bulk add
            because reviewing what people asked for is the thing with someone
            on the other end of it. */}
        <AdminRequests />

        {/* Bulk add */}
        <div className="space-y-3">
          <button
            onClick={() => setBulkOpen(p => !p)}
            className="flex items-center gap-1.5 text-micro font-medium text-ink-3 hover:text-foreground transition-colors"
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
                className="w-full px-3 py-2 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors placeholder:text-ink-3 disabled:opacity-60 resize-none"
              />
              <button
                onClick={handleBulkSubmit}
                disabled={isRunningQueue || !bulkInput.trim()}
                className="h-9 px-4 text-bodytext font-medium bg-foreground text-background rounded-[4px] disabled:opacity-40 hover:opacity-85 transition-opacity"
              >
                {isRunningQueue ? 'Processing…' : `Add ${bulkInput.split('\n').filter(u => u.trim()).length} URLs →`}
              </button>
            </div>
          )}

          {queue.length > 0 && (
            <div className="space-y-px">
              {queue.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-[4px]">
                  <span className="shrink-0">
                    {item.status === 'pending' && <span className="w-1.5 h-1.5 rounded-full bg-ink-4 inline-block" />}
                    {item.status === 'processing' && <CircleNotch className="w-3 h-3 animate-spin text-ink-3" weight="bold" />}
                    {item.status === 'done' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />}
                    {item.status === 'error' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
                  </span>
                  <span className="text-ui text-ink-3 truncate flex-1">{getDomain(item.url)}</span>
                  {item.message && (
                    <span className="text-meta text-ink-3 shrink-0">{item.message}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add site */}
        <div className="space-y-3">
          <p className="text-micro font-medium text-ink-3">
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
              className="flex-1 h-9 px-3 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors placeholder:text-ink-3 disabled:opacity-60"
            />
            <select
              value={overrideKind}
              onChange={e => setOverrideKind(e.target.value as Kind | '')}
              disabled={isAdding}
              className="h-9 px-2 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors disabled:opacity-60 shrink-0"
              aria-label="Kind for the site being added"
              title="Leave on Auto-file to let extraction file it"
            >
              <option value="">Auto-file</option>
              {KINDS.map(kind => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
            <button
              onClick={handleAdd}
              disabled={isAdding || !linkInput.trim()}
              className="h-9 px-4 text-bodytext font-medium bg-foreground text-background rounded-[4px] disabled:opacity-40 hover:opacity-85 transition-opacity whitespace-nowrap shrink-0"
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
                <span className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin text-ink-3 flex-shrink-0" />
                <span className="text-ui text-ink-3">{addStage}</span>
              </motion.div>
            )}
            {addError && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-ui text-destructive"
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
                className="text-ui text-emerald-600 dark:text-emerald-400"
              >
                ✓ Site added{addedKind ? ` — filed under ${addedKind}` : ''}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Stats row */}
        <div className="space-y-3 py-3 border-y border-edge">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div>
              <p className="text-heading tabular-nums">{allSites.length}</p>
              <p className="text-meta text-ink-3 mt-0.5">Total sites</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <p className={"text-heading tabular-nums " + (unsortedCount > 0 ? 'text-amber-600 dark:text-amber-400' : '')}>{filedCount}</p>
              <p className="text-meta text-ink-3 mt-0.5">
                Filed{unsortedCount > 0 ? ` · ${unsortedCount} unsorted` : ''}
              </p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <p className="text-heading tabular-nums text-emerald-600 dark:text-emerald-400">{inGallery}</p>
              <p className="text-meta text-ink-3 mt-0.5">In gallery</p>
            </div>
            <div className="w-px h-8 bg-border/40" />
            <div>
              <p className="text-heading tabular-nums text-amber-600 dark:text-amber-400">{failed}</p>
              <p className="text-meta text-ink-3 mt-0.5">Failed</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {unsortedCount > 0 && (
              <button
                onClick={handleFileUnsorted}
                disabled={isFilingUnsorted}
                className="h-8 px-3 text-ui border border-foreground/20 bg-foreground/[0.04] rounded-[4px] disabled:opacity-40 hover:bg-foreground/[0.08] hover:border-foreground/40 transition-colors flex items-center gap-1.5 whitespace-nowrap"
              >
                {isFilingUnsorted
                  ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> Filing…</>
                  : <><Check className="w-3 h-3" weight="bold" /> File {unsortedCount} unsorted</>
                }
              </button>
            )}
            {fileResult && (
              <span className="text-ui text-ink-3">{fileResult}</span>
            )}
            {kindError && (
              <span className="text-ui text-destructive" role="alert">{kindError}</span>
            )}
            {dedupResult && (
              <span className="text-ui text-ink-3">{dedupResult}</span>
            )}
            <button
              onClick={handleDeduplicate}
              disabled={isDeduping}
              className="h-8 px-3 text-ui border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isDeduping
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> Deduplicating…</>
                : <><ArrowCounterClockwise className="w-3 h-3" weight="regular" /> Remove duplicates</>
              }
            </button>
            <button
              onClick={handleBackfillData}
              disabled={isDataBackfilling}
              className="h-8 px-3 text-ui border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isDataBackfilling
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {dataBackfillProgress?.done}/{dataBackfillProgress?.total}</>
                : <><ArrowCounterClockwise className="w-3 h-3" weight="regular" /> Backfill colors &amp; type</>
              }
            </button>
            <button
              onClick={handleBackfillPreviews}
              disabled={isPreviewBackfilling}
              className="h-8 px-3 text-[12px] font-mono border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isPreviewBackfilling
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {previewBackfillProgress?.done}/{previewBackfillProgress?.total}</>
                : <><ImageSquare className="w-3 h-3" weight="regular" /> Backfill previews</>
              }
            </button>
            <button
              onClick={handleBackfillMobile}
              disabled={isBackfilling}
              className="h-8 px-3 text-ui border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {isBackfilling
                ? <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /> {backfillProgress?.done}/{backfillProgress?.total}</>
                : 'Backfill mobile'
              }
            </button>
          </div>
        </div>

        {/* Kind filter — the same shelf order as the gallery, with counts so an
            unbalanced library is visible at a glance. */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by kind">
          <button
            onClick={() => setKindFilter('all')}
            aria-pressed={kindFilter === 'all'}
            className={"h-7 px-2.5 text-meta rounded-[4px] border transition-colors whitespace-nowrap " + (
              kindFilter === 'all'
                ? 'bg-foreground text-background border-foreground'
                : 'border-edge-strong text-ink-3 hover:text-foreground hover:bg-muted'
            )}
          >
            All <span className="tabular-nums opacity-60">{allSites.length}</span>
          </button>
          {KINDS.map(kind => {
            const count = kindCounts[kind] ?? 0
            const active = kindFilter === kind
            return (
              <button
                key={kind}
                onClick={() => setKindFilter(kind)}
                aria-pressed={active}
                className={"h-7 px-2.5 text-meta rounded-[4px] border transition-colors whitespace-nowrap " + (
                  active
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-edge-strong hover:text-foreground hover:bg-muted ' + (count === 0 ? 'text-ink-4' : 'text-ink-3')
                )}
              >
                {kind} <span className="tabular-nums opacity-60">{count}</span>
              </button>
            )
          })}
          {unsortedCount > 0 && (
            <button
              onClick={() => setKindFilter(UNSORTED)}
              aria-pressed={kindFilter === UNSORTED}
              className={"h-7 px-2.5 text-meta rounded-[4px] border transition-colors whitespace-nowrap " + (
                kindFilter === UNSORTED
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
              )}
            >
              {UNSORTED} <span className="tabular-nums opacity-70">{unsortedCount}</span>
            </button>
          )}
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-3" weight="regular" />
            <input
              type="text"
              placeholder="Search sites…"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors placeholder:text-ink-3"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-meta text-ink-3">Added</span>
            <select
              value={addedFilter}
              onChange={event => setAddedFilter(event.target.value as AddedFilter)}
              className="h-8 px-2 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors"
              aria-label="Filter by date added"
            >
              {ADDED_FILTERS.map(filter => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-meta text-ink-3">Sort</span>
            <select
              value={dateSort}
              onChange={event => setDateSort(event.target.value as DateSort)}
              className="h-8 px-2 text-ui bg-muted border border-edge-strong rounded-[4px] outline-none focus:border-foreground/40 transition-colors"
              aria-label="Sort by date added"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
          <span className="text-ui text-ink-3">
            {isLoadingSites ? '…' : `${sortedSites.length} sites`}
          </span>
        </div>

        {/* Site list */}
        {isLoadingSites ? (
          <div className="flex items-center justify-center py-16">
            <CircleNotch className="w-4 h-4 animate-spin text-ink-3" weight="bold" />
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-ui text-ink-3">No sites found.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {paginated.map(site => (
              <motion.div
                key={site.id}
                layout
                initial={addedId === site.id ? { opacity: 0, y: -8 } : false}
                animate={{ opacity: 1, y: 0 }}
                className={"group flex items-center gap-4 px-3 py-3 rounded-[4px] transition-colors " + (addedId === site.id ? 'bg-emerald-500/5 border border-emerald-500/20' : 'hover:bg-muted/40 border border-transparent')}
              >
                {/* Thumbnail */}
                <div className="w-12 h-8 rounded-[4px] bg-muted border border-edge overflow-hidden shrink-0">
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
                    <p className="text-bodytext font-medium truncate">
                      {site.source_name}
                    </p>
                    <a
                      href={site.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={event => event.stopPropagation()}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-ink-3 transition-colors hover:bg-muted hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
                      aria-label={`Open live site for ${site.source_name}`}
                      title={`Open ${getDomain(site.source_url)}`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" weight="regular" />
                    </a>
                    <select
                      value={site.kind}
                      onChange={event => handleKindChange(site.id, event.target.value as Kind)}
                      disabled={savingKindId === site.id}
                      className={"h-6 px-1.5 text-[10px] font-mono rounded-[4px] border outline-none transition-colors disabled:opacity-60 cursor-pointer " + (
                        site.kind === UNSORTED
                          ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5'
                          : 'border-edge text-ink-3 bg-transparent hover:border-edge-strong hover:text-foreground'
                      )}
                      aria-label={`Kind for ${site.source_name}`}
                      title={savingKindId === site.id ? 'Saving…' : 'Change kind'}
                    >
                      {(site.kind === UNSORTED || !(KINDS as readonly string[]).includes(site.kind)) && (
                        <option value={site.kind}>{site.kind}</option>
                      )}
                      {KINDS.map(kind => (
                        <option key={kind} value={kind}>{kind}</option>
                      ))}
                    </select>
                  </div>
                  <p className="text-meta text-ink-3 truncate mt-0.5">
                    {getDomain(site.source_url)}
                  </p>
                </div>

                {/* Status */}
                <div className="shrink-0 hidden sm:block">
                  <SiteStatus site={site} />
                </div>

                {/* Date */}
                <div className="text-meta text-ink-3 shrink-0 hidden md:block text-right tabular-nums">
                  <p>
                    {site.created_at ? new Date(site.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </p>
                  <p className="text-ink-4">{formatAge(site.created_at)}</p>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(site.id)}
                  disabled={deletingId === site.id}
                  className="w-7 h-7 flex items-center justify-center rounded-[4px] border border-transparent opacity-0 group-hover:opacity-100 hover:border-destructive/40 hover:bg-destructive/5 text-ink-3 hover:text-destructive transition-[color,background-color,border-color,opacity] disabled:opacity-50 shrink-0"
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
          <div className="flex items-center justify-center gap-2 pt-4 border-t border-edge">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3 text-ui border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors"
            >
              ←
            </button>
            <span className="text-ui text-ink-3 tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3 text-ui border border-edge-strong rounded-[4px] disabled:opacity-40 hover:bg-muted transition-colors"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
