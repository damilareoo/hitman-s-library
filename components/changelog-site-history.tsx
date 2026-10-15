// components/changelog-site-history.tsx
// Per-site filter for the changelog (Phase 1): extraction_history events for
// one site, read live from the history API.
'use client'

import { useState, useEffect } from 'react'

interface SiteSnapshot {
  id: number
  captured_at: string
  palette: Array<{ hex: string }>
  typography: Array<{ fontFamily: string }>
  extractor_version: string | null
  redesigned_vs_previous: boolean | null
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    })
  } catch {
    return iso
  }
}

export function ChangelogSiteHistory({ siteId }: { siteId: number }) {
  const [snapshots, setSnapshots] = useState<SiteSnapshot[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/design/${siteId}/history`)
      .then(r => r.json())
      .then(raw => { if (!cancelled) setSnapshots(Array.isArray(raw.snapshots) ? raw.snapshots : []) })
      .catch(() => { if (!cancelled) setSnapshots([]) })
    return () => { cancelled = true }
  }, [siteId])

  return (
    <section aria-label={`Snapshots for site ${siteId}`} className="mb-10 rounded-[4px] border border-edge p-5">
      <h2 className="text-heading text-foreground mb-1">
        Site #{siteId}
      </h2>
      <p className="text-bodytext text-ink-3 mb-4">
        Every extraction snapshot, newest last.
      </p>
      {snapshots === null ? (
        <p className="text-meta text-ink-4">Loading snapshots…</p>
      ) : snapshots.length === 0 ? (
        <p className="text-meta text-ink-4">No snapshots recorded for this site.</p>
      ) : (
        <ol className="space-y-3">
          {[...snapshots].reverse().map(s => (
            <li key={s.id} className="flex items-start gap-3">
              <div className="shrink-0 mt-[6px]">
                <div className={`w-1.5 h-1.5 rounded-full ${s.redesigned_vs_previous ? 'bg-[var(--color-running)]' : 'bg-ink-4'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-reading text-ink-2">
                  {s.redesigned_vs_previous ? 'Redesigned' : 'Re-extracted'}
                  {' '}— {s.palette.length} colors, {s.typography.length} typefaces
                </p>
                <p className="text-micro text-ink-4 tabular-nums">
                  {formatDateTime(s.captured_at)}
                  {s.extractor_version ? ` · ${s.extractor_version}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
