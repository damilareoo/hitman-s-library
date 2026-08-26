'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUpRight, Check, X, Users } from '@phosphor-icons/react'
import { Spinner } from '@/components/ui/spinner'

interface RequestRow {
  id: string
  url: string
  status: string
  sourceId: string | null
  title: string | null
  image: string | null
  requestCount: number
  createdAt: string
}

type Tab = 'pending' | 'added' | 'dismissed'

const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Pending' },
  { id: 'added', label: 'Added' },
  { id: 'dismissed', label: 'Passed' },
]

/**
 * The review queue for publicly submitted sites.
 *
 * Approving calls the same extraction route the add form uses, so there is one
 * path into the library rather than two that can drift apart. A failed approval
 * leaves the request pending — it is something to retry, not something to lose.
 */
export function AdminRequests() {
  const [tab, setTab] = useState<Tab>('pending')
  const [rows, setRows] = useState<RequestRow[]>([])
  const [counts, setCounts] = useState({ pending: 0, added: 0, dismissed: 0 })
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (which: Tab) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/requests?status=${which}`)
      if (!res.ok) throw new Error('Could not load requests')
      const data = await res.json()
      setRows(data.requests ?? [])
      setCounts(data.counts ?? { pending: 0, added: 0, dismissed: 0 })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load requests')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(tab) }, [tab, load])

  async function approve(row: RequestRow) {
    setBusyId(row.id)
    setError(null)
    try {
      const res = await fetch('/api/admin/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(`${new URL(row.url).hostname}: ${data.error}`)
        return
      }
      await load(tab)
    } catch {
      setError('Approval failed. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  async function setStatus(row: RequestRow, status: 'pending' | 'dismissed') {
    setBusyId(row.id)
    try {
      await fetch('/api/admin/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id, status }),
      })
      await load(tab)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <p className="text-micro font-medium text-ink-3">Requests</p>
        <div className="flex items-center gap-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={
                'px-2 py-0.5 rounded-[4px] text-meta border transition-colors ' +
                (tab === id
                  ? 'bg-muted text-ink border-edge-strong'
                  : 'text-ink-4 border-transparent hover:text-ink-2')
              }
            >
              {label}
              {id === 'pending' && counts.pending > 0 && (
                <span className="ml-1 tabular-nums text-ink-3">{counts.pending}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-meta text-[var(--color-error)]">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-ink-3">
          <Spinner /> <span className="text-meta">Loading…</span>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-meta text-ink-4 py-6">
          {tab === 'pending' ? 'No requests waiting.' : `Nothing ${tab === 'added' ? 'added from requests' : 'passed on'} yet.`}
        </p>
      ) : (
        <ul className="space-y-1.5" role="list">
          {rows.map(row => {
            const busy = busyId === row.id
            const host = safeHost(row.url)
            return (
              <li
                key={row.id}
                className="flex items-center gap-3 p-2 rounded-[4px] border border-edge bg-muted/30"
              >
                {row.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.image} alt="" className="w-12 h-9 rounded-[3px] object-cover object-top border border-edge-faint shrink-0 bg-muted" />
                ) : (
                  <span className="w-12 h-9 rounded-[3px] border border-edge-faint shrink-0 bg-muted" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-bodytext text-ink truncate">{row.title ?? host}</p>
                  <p className="text-meta text-ink-4 truncate">{host}</p>
                </div>

                {row.requestCount > 1 && (
                  <span
                    className="shrink-0 inline-flex items-center gap-1 text-micro text-ink-3"
                    title={`${row.requestCount} people asked for this`}
                  >
                    <Users className="w-3 h-3" weight="regular" />
                    <span className="tabular-nums">{row.requestCount}</span>
                  </span>
                )}

                <a
                  href={row.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 w-7 h-7 flex items-center justify-center rounded-[4px] text-ink-4 hover:text-ink hover:bg-muted transition-colors"
                  aria-label={`Open ${host}`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" weight="bold" />
                </a>

                {tab === 'pending' && (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() => setStatus(row, 'dismissed')}
                      disabled={busy}
                      className="h-7 px-2 rounded-[4px] border border-edge-strong text-meta text-ink-3 hover:text-ink disabled:opacity-40 transition-colors"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => approve(row)}
                      disabled={busy}
                      className="h-7 px-2.5 inline-flex items-center gap-1 rounded-[4px] bg-foreground text-background text-meta font-medium hover:opacity-85 disabled:opacity-40 transition-opacity"
                    >
                      {busy ? <Spinner className="w-3 h-3 border-t-background" /> : <Check className="w-3 h-3" weight="bold" />}
                      {busy ? 'Extracting…' : 'Approve'}
                    </button>
                  </div>
                )}

                {tab === 'dismissed' && (
                  <button
                    onClick={() => setStatus(row, 'pending')}
                    disabled={busy}
                    className="shrink-0 h-7 px-2 rounded-[4px] border border-edge-strong text-meta text-ink-3 hover:text-ink disabled:opacity-40 transition-colors"
                  >
                    Restore
                  </button>
                )}

                {tab === 'added' && row.sourceId && (
                  <a
                    href={`/?site=${row.sourceId}`}
                    className="shrink-0 inline-flex items-center gap-1 text-meta text-ink-3 hover:text-ink transition-colors"
                  >
                    View <ArrowUpRight className="w-3 h-3" weight="bold" />
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function safeHost(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
