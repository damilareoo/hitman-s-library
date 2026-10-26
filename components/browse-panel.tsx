'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { displayKind } from '@/lib/categories'
import type { CollectionMap } from '@/lib/collections'
import type { Design } from '@/components/design-card'

interface BrowseSite {
  id: string
  title: string
  url: string
  kind: string
  thumb: string | null
  tags: string[]
}

interface BrowsePanelProps {
  open: boolean
  onClose: () => void
  total: number
  kinds: { name: string; count: number }[]
  collections: CollectionMap
  recents: Design[]
  onKind: (name: string) => void
  onSet: (name: string) => void
  onDeleteSet: (name: string) => void
  onOpenSite: (id: string) => void
  onRequest: (query: string) => void
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

const KBD =
  'inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-[4px] border border-edge text-[10px] tracking-[0.08em] uppercase text-ink-4'

/**
 * The ⌘K layer: the library's kinds, sets and newest arrivals in one place,
 * with a search that scores in the browser.
 *
 * The page itself keeps a search field and a chip row; this is for the times
 * you know roughly what you want and would rather type than scan. It replaces
 * the rail that used to hold kinds — the grid gets that width back.
 */
export function BrowsePanel({
  open,
  onClose,
  total,
  kinds,
  collections,
  recents,
  onKind,
  onSet,
  onDeleteSet,
  onOpenSite,
  onRequest,
}: BrowsePanelProps) {
  const [query, setQuery] = useState('')
  const [sites, setSites] = useState<BrowseSite[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)
  const requested = useRef(false)
  // Read through a ref so an inline onClose from the parent cannot re-run the
  // open effect and wipe the query on an unrelated re-render.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Fetched once per session, on the first open. Everything after that is
  // local, which is what makes typing feel immediate. Deliberately not tied
  // to the open state for cleanup: closing mid-flight must not throw away an
  // index that is already on its way.
  useEffect(() => {
    if (!open || requested.current) return
    requested.current = true
    setFailed(false)
    fetch('/api/design/browse-index')
      .then(r => {
        if (!r.ok) throw new Error(`browse-index ${r.status}`)
        return r.json()
      })
      .then(data => setSites(Array.isArray(data.sites) ? data.sites : []))
      .catch(() => {
        setSites([])
        setFailed(true)
        requested.current = false
      })
  }, [open, attempt])

  // Modal contract: Escape closes and Tab cycles inside the layer, both in the
  // capture phase — the gallery has its own Escape handler for the site panel,
  // and it must not also run while this one is open. Focus goes back to
  // whatever opened the panel on close.
  useEffect(() => {
    if (!open) return
    restoreFocus.current = document.activeElement as HTMLElement
    setQuery('')
    setActive(0)
    const t = setTimeout(() => inputRef.current?.focus(), 40)

    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ))
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKey, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('keydown', onKey, true)
      restoreFocus.current?.focus?.()
    }
  }, [open])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || !sites) return []
    const scored: { site: BrowseSite; score: number }[] = []
    for (const site of sites) {
      const title = site.title.toLowerCase()
      const host = domainOf(site.url).toLowerCase()
      let score = 0
      if (title.startsWith(q)) score = 4
      else if (title.includes(q) || host.includes(q)) score = 3
      else if (site.kind.toLowerCase().startsWith(q)) score = 2
      else if (site.tags.some(tag => tag.toLowerCase().includes(q))) score = 1
      if (score > 0) scored.push({ site, score })
    }
    // Sort is stable, so equal scores keep the newest-first order they came in.
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, 40).map(entry => entry.site)
  }, [query, sites])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [active, results])

  const openResult = useCallback((id: string) => {
    onClose()
    onOpenSite(id)
  }, [onClose, onOpenSite])

  function onKeyDown(e: KeyboardEvent) {
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = results[active]
      if (hit) openResult(hit.id)
    }
  }

  const searching = query.trim().length > 0
  const sets = Object.entries(collections)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="browse-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[70] bg-background/55 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-[71] flex justify-center items-start pointer-events-none px-4">
            <motion.div
              key="browse-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Browse the library"
              initial={{ opacity: 0, y: -8, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onKeyDown={onKeyDown}
              className="pointer-events-auto mt-[12vh] w-full max-w-[824px] max-h-[min(70vh,640px)] flex flex-col rounded-[12px] border border-edge-strong bg-popover text-popover-foreground shadow-[0_24px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-edge shrink-0">
                <MagnifyingGlass className="w-3.5 h-3.5 text-ink-3 shrink-0" weight="regular" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => { setQuery(e.target.value); setActive(0) }}
                  placeholder="Search sites, kinds, tags…"
                  aria-label="Search the library"
                  autoComplete="off"
                  spellCheck={false}
                  className="flex-1 min-w-0 bg-transparent outline-none text-[16px] tracking-[-0.005em] text-foreground placeholder:text-ink-4"
                />
                <kbd className={`${KBD} max-md:hidden`}>esc</kbd>
              </div>

              <div ref={listRef} data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto p-2.5">
                {searching ? (
                  failed ? (
                    <div className="px-4 py-7 text-center">
                      <p className="text-bodytext text-ink-3">Search is unavailable right now.</p>
                      <button
                        onClick={() => { setSites(null); setAttempt(n => n + 1) }}
                        className="mt-3 h-8 px-3 rounded-[8px] text-meta bg-foreground/[0.055] text-ink-2 hover:text-ink hover:bg-foreground/[0.09] transition-colors"
                      >
                        Try again
                      </button>
                    </div>
                  ) : sites === null ? (
                    <p className="px-4 py-7 text-center text-bodytext text-ink-3">Loading the library…</p>
                  ) : results.length === 0 ? (
                    <div className="px-4 py-7 text-center">
                      <p className="text-bodytext text-ink-3">Nothing for “{query.trim()}”.</p>
                      <button
                        onClick={() => { onClose(); onRequest(query.trim()) }}
                        className="mt-3 h-8 px-3 rounded-[8px] text-meta bg-foreground text-background font-medium hover:opacity-90 transition-opacity"
                      >
                        Request it
                      </button>
                    </div>
                  ) : (
                    results.map((site, i) => (
                      <button
                        key={site.id}
                        onClick={() => openResult(site.id)}
                        onMouseEnter={() => setActive(i)}
                        data-active={i === active}
                        className="w-full flex items-center gap-3 p-2 rounded-[8px] text-left transition-colors duration-[var(--dur-2)] ease-[var(--ease-hover)] data-[active=true]:bg-muted hover:bg-muted"
                      >
                        <span className="w-[52px] h-8 rounded-[5px] overflow-hidden border border-edge bg-muted shrink-0">
                          {site.thumb && <img src={site.thumb} alt="" loading="lazy" className="w-full h-full object-cover object-top" />}
                        </span>
                        <span className="flex-1 min-w-0 text-bodytext text-ink truncate">{site.title}</span>
                        <span className="text-meta text-ink-4 truncate max-w-[180px] shrink-0 max-sm:hidden">{domainOf(site.url)}</span>
                        <span className="text-meta text-ink-4 shrink-0">{displayKind(site.kind)}</span>
                      </button>
                    ))
                  )
                ) : (
                  <>
                    <div className="px-4 pt-3.5 pb-1.5 text-micro text-ink-4">Kinds</div>
                    <div className="flex flex-wrap gap-1.5 px-4 pb-3.5 mb-1 border-b border-edge">
                      <button onClick={() => onKind('All')} className="h-7 px-2.5 rounded-[8px] text-meta text-ink-2 bg-foreground/[0.055] hover:text-ink hover:bg-foreground/[0.09] transition-colors">
                        All <span className="text-ink-4 tabular-nums">{total}</span>
                      </button>
                      {kinds.map(({ name, count }) => (
                        <button
                          key={name}
                          onClick={() => onKind(name)}
                          className="h-7 px-2.5 rounded-[8px] text-meta text-ink-2 bg-foreground/[0.055] hover:text-ink hover:bg-foreground/[0.09] transition-colors"
                        >
                          {displayKind(name)} <span className="text-ink-4 tabular-nums">{count}</span>
                        </button>
                      ))}
                    </div>

                    {sets.length > 0 && (
                      <>
                        <div className="px-4 pt-3.5 pb-1.5 text-micro text-ink-4">Sets</div>
                        {sets.map(([name, ids]) => (
                          <div key={name} className="group flex items-center gap-1">
                            <button
                              onClick={() => onSet(name)}
                              className="flex-1 min-w-0 flex items-center gap-3 p-2 rounded-[8px] text-left hover:bg-muted transition-colors"
                            >
                              <span className="flex-1 min-w-0 text-bodytext text-ink truncate">{name}</span>
                              <span className="text-meta text-ink-4 shrink-0">{ids.length} sites</span>
                            </button>
                            {/* Deleting a set is a set-level action: it removes
                                the shelf, never the sites on it. */}
                            <button
                              onClick={() => onDeleteSet(name)}
                              aria-label={`Delete set ${name}`}
                              title={`Delete set ${name}`}
                              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-[6px] text-ink-4 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-ink hover:bg-muted transition-[opacity,background-color,color] duration-[var(--dur-2)]"
                            >
                              <span aria-hidden="true">×</span>
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    <div className="px-4 pt-3.5 pb-1.5 text-micro text-ink-4">Recently added</div>
                    {recents.slice(0, 6).map(design => (
                      <button
                        key={design.id}
                        onClick={() => openResult(design.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-[8px] text-left hover:bg-muted transition-colors"
                      >
                        <span className="w-[52px] h-8 rounded-[5px] overflow-hidden border border-edge bg-muted shrink-0">
                          {design.thumbnail_url && (
                            <img src={design.thumbnail_url} alt="" loading="lazy" className="w-full h-full object-cover object-top" />
                          )}
                        </span>
                        <span className="flex-1 min-w-0 text-bodytext text-ink truncate">{design.title}</span>
                        <span className="text-meta text-ink-4 truncate max-w-[180px] shrink-0 max-sm:hidden">{domainOf(design.url)}</span>
                        <span className="text-meta text-ink-4 shrink-0">{displayKind(design.kind)}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-2.5 border-t border-edge text-meta text-ink-4 shrink-0">
                <span className="flex items-center gap-1.5 max-md:hidden">
                  <kbd className={KBD}>↑</kbd><kbd className={KBD}>↓</kbd><span>navigate</span>
                  <kbd className={`${KBD} ml-1`}>↵</kbd><span>open</span>
                </span>
                <span className="ml-auto tabular-nums">
                  {total} sites · {kinds.length} kinds · {sets.length} sets
                </span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
