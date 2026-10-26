// components/history-tab.tsx
// Per-site time travel (Phase 1): scrub between any two snapshots and see
// what changed — side-by-side captures, palette appeared/vanished in OKLCH,
// and font/weight swaps per role.
'use client'

import { useState, useEffect, useCallback } from 'react'
import { TabEmptyState } from './tab-empty-state'
import { Spinner } from './ui/spinner'

interface HistorySnapshot {
  id: number
  captured_at: string
  screenshot_url: string | null
  mobile_screenshot_url: string | null
  palette: Array<{ hex: string; oklch: string }>
  typography: Array<{ fontFamily: string; role: string; googleFontsUrl: string | null; primaryWeight: number }>
  extractor_version: string | null
  redesigned_vs_previous: boolean | null
}

interface PairDiff {
  appeared: Array<{ hex: string; oklch: string }>
  vanished: Array<{ hex: string; oklch: string }>
  typoChanges: Array<{
    role: string
    beforeFamily: string | null
    afterFamily: string | null
    beforeWeight: number | null
    afterWeight: number | null
    familyChanged: boolean
    weightChanged: boolean
  }>
  paletteTurnover: number
  screenshotChanged: boolean | null
  redesigned: boolean
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return iso
  }
}

function Swatch({ hex, oklch }: { hex: string; oklch: string }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span
        aria-hidden="true"
        className="w-4 h-4 rounded-full border border-black/[0.06] dark:border-white/[0.22] shrink-0"
        style={{ backgroundColor: hex }}
      />
      <span className="text-meta tabular-nums truncate">{oklch || hex}</span>
    </span>
  )
}

export function HistoryTab({ siteId }: { siteId: number }) {
  const [snapshots, setSnapshots] = useState<HistorySnapshot[] | null>(null)
  const [aId, setAId] = useState<number | null>(null)
  const [bId, setBId] = useState<number | null>(null)
  const [pair, setPair] = useState<PairDiff | null>(null)
  const [pairLoading, setPairLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/design/${siteId}/history`)
      .then(r => r.json())
      .then(raw => {
        if (cancelled || !Array.isArray(raw.snapshots)) return
        const list: HistorySnapshot[] = raw.snapshots
        setSnapshots(list)
        // Default view: newest against its predecessor.
        if (list.length >= 2) {
          setAId(list[list.length - 2].id)
          setBId(list[list.length - 1].id)
        } else if (list.length === 1) {
          setBId(list[0].id)
        }
      })
      .catch(() => { if (!cancelled) setSnapshots([]) })
    return () => { cancelled = true }
  }, [siteId])

  useEffect(() => {
    if (aId == null || bId == null || aId === bId) { setPair(null); return }
    let cancelled = false
    setPairLoading(true)
    fetch(`/api/design/${siteId}/history?a=${aId}&b=${bId}`)
      .then(r => r.json())
      .then(raw => { if (!cancelled) setPair(raw.pair ?? null) })
      .catch(() => { if (!cancelled) setPair(null) })
      .finally(() => { if (!cancelled) setPairLoading(false) })
    return () => { cancelled = true }
  }, [siteId, aId, bId])

  const selectB = useCallback((id: number) => {
    if (!snapshots) return
    const idx = snapshots.findIndex(s => s.id === id)
    setBId(id)
    // A follows to the predecessor unless the pinned A is still older.
    setAId(prev => {
      if (prev != null && snapshots.some(s => s.id === prev && snapshots.indexOf(s) < idx)) return prev
      return idx > 0 ? snapshots[idx - 1].id : null
    })
  }, [snapshots])

  function scrubKeyDown(e: React.KeyboardEvent) {
    if (!snapshots || snapshots.length < 2) return
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const idx = snapshots.findIndex(s => s.id === bId)
    const next = e.key === 'ArrowRight'
      ? Math.min(idx + 1, snapshots.length - 1)
      : Math.max(idx - 1, 0)
    if (snapshots[next]) selectB(snapshots[next].id)
  }

  if (snapshots === null) {
    return (
      <div className="flex items-center justify-center flex-1">
        <Spinner />
      </div>
    )
  }

  if (snapshots.length < 2) {
    return (
      <TabEmptyState
        message={snapshots.length === 0 ? 'No snapshots yet' : 'Only one snapshot so far — re-extract to start tracking drift.'}
      />
    )
  }

  const snapA = snapshots.find(s => s.id === aId) ?? null
  const snapB = snapshots.find(s => s.id === bId) ?? null

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto" data-lenis-prevent>
      {/* Scrubber */}
      <div className="shrink-0 border-b border-edge px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-micro text-ink-4 tabular-nums">{snapshots.length} snapshots</span>
          <a
            href={`/changelog?site=${siteId}`}
            className="text-micro text-ink-4 hover:text-ink transition-colors"
          >
            Open in changelog
          </a>
        </div>
        <div
          role="group"
          aria-label="Snapshots — left and right arrows move the comparison"
          tabIndex={0}
          onKeyDown={scrubKeyDown}
          className="flex gap-2 overflow-x-auto pb-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/40 rounded-[4px]"
        >
          {snapshots.map(s => {
            const isA = s.id === aId
            const isB = s.id === bId
            return (
              <div key={s.id} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => selectB(s.id)}
                  aria-pressed={isB}
                  aria-label={`Compare ${formatDate(s.captured_at)}${s.redesigned_vs_previous ? ' (redesigned)' : ''}`}
                  title={formatDate(s.captured_at)}
                  className={[
                    'w-20 rounded-[4px] overflow-hidden border transition-colors',
                    isB ? 'border-foreground/60' : 'border-edge hover:border-foreground/20',
                  ].join(' ')}
                >
                  {s.screenshot_url ? (
                    // Plain img: captures are large and numerous; keep them out
                    // of the optimizer and lazy.
                    <img
                      src={s.screenshot_url}
                      alt=""
                      loading="lazy"
                      className="w-20 h-24 object-cover object-top"
                    />
                  ) : (
                    <span className="w-20 h-24 flex items-center justify-center text-meta text-ink-4 bg-muted">—</span>
                  )}
                  <span className={[
                    'block px-1 py-1 text-micro tabular-nums truncate',
                    isB ? 'text-ink' : 'text-ink-4',
                  ].join(' ')}>
                    {formatDate(s.captured_at)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setAId(s.id)}
                  aria-pressed={isA}
                  aria-label={`Pin ${formatDate(s.captured_at)} as comparison start`}
                  title="Pin as A"
                  className={[
                    'absolute top-1 left-1 w-5 h-5 rounded-full text-micro flex items-center justify-center border backdrop-blur-sm transition-colors',
                    isA
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-background/80 text-ink-4 border-edge hover:text-ink',
                  ].join(' ')}
                >
                  A
                </button>
                {s.redesigned_vs_previous && (
                  <span className="absolute top-1 right-1 rounded-full bg-background/90 border border-edge px-1.5 text-micro text-ink-2">
                    R
                  </span>
                )}
              </div>
            )
          })}
        </div>
        <p className="text-micro text-ink-4 mt-1.5">
          Click a snapshot to compare it{pair && snapA && snapB ? ` — A ${formatDate(snapA.captured_at)} vs B ${formatDate(snapB.captured_at)}` : ''}. Pin A for any two.
        </p>
      </div>

      {/* Comparison */}
      {pairLoading ? (
        <div className="flex items-center justify-center flex-1 py-10">
          <Spinner />
        </div>
      ) : pair && snapA && snapB ? (
        <div className="flex flex-col gap-5 p-4">
          {pair.redesigned && (
            <p className="text-meta text-ink-2 rounded-[4px] border border-edge bg-muted/60 px-3 py-2">
              Redesigned between these snapshots.
            </p>
          )}

          {/* Side-by-side captures */}
          <section aria-label="Screenshots">
            <div className="grid grid-cols-2 gap-2">
              {[
                { snap: snapA, label: 'A' },
                { snap: snapB, label: 'B' },
              ].map(({ snap, label }) => (
                <figure key={label} className="min-w-0">
                  <div data-lenis-prevent className="rounded-[4px] overflow-hidden border border-edge bg-muted max-h-72 overflow-y-auto">
                    {snap.screenshot_url ? (
                      <img src={snap.screenshot_url} alt={`${label} — ${formatDate(snap.captured_at)}`} loading="lazy" className="w-full object-top" />
                    ) : (
                      <span className="block p-6 text-meta text-ink-4 text-center">No capture</span>
                    )}
                  </div>
                  <figcaption className="text-micro text-ink-4 tabular-nums mt-1 truncate">
                    {label} · {formatDate(snap.captured_at)}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>

          {/* Palette diff */}
          <section aria-label="Palette changes">
            <h3 className="text-meta text-ink-3 mb-2">Palette</h3>
            {pair.appeared.length === 0 && pair.vanished.length === 0 ? (
              <p className="text-meta text-ink-4">Unchanged between these snapshots.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-micro text-ink-4 mb-1.5">Appeared ({pair.appeared.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {pair.appeared.map(c => <Swatch key={c.hex} hex={c.hex} oklch={c.oklch} />)}
                  </div>
                </div>
                <div>
                  <p className="text-micro text-ink-4 mb-1.5">Vanished ({pair.vanished.length})</p>
                  <div className="flex flex-col gap-1.5">
                    {pair.vanished.map(c => <Swatch key={c.hex} hex={c.hex} oklch={c.oklch} />)}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Typography diff */}
          <section aria-label="Typography changes">
            <h3 className="text-meta text-ink-3 mb-2">Typography</h3>
            {pair.typoChanges.length === 0 ? (
              <p className="text-meta text-ink-4">No typography recorded.</p>
            ) : (
              <div className="flex flex-col rounded-[4px] border border-edge divide-y divide-edge-faint overflow-hidden">
                {pair.typoChanges.map(t => (
                  <div key={t.role} className="px-3 py-2">
                    <p className="text-micro text-ink-4 capitalize">{t.role}</p>
                    <p className="text-bodytext text-ink truncate">
                      {t.beforeFamily ?? '—'}
                      {(t.familyChanged || t.weightChanged) && (
                        <span className="text-ink-4"> → {t.afterFamily ?? '—'}</span>
                      )}
                    </p>
                    {(t.beforeWeight != null || t.afterWeight != null) && (
                      <p className="text-micro text-ink-4 tabular-nums">
                        {t.beforeWeight ?? '—'}
                        {t.weightChanged && <span> → {t.afterWeight}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : (
        <p className="text-meta text-ink-4 p-4">Pick two snapshots to compare.</p>
      )}
    </div>
  )
}
