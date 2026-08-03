'use client'

import { useState, useEffect, useCallback } from 'react'

interface ChangelogEvent {
  id: number
  source_id: number | null
  source_url: string
  source_name: string
  event_type: 'added' | 'reextracted' | 'deleted'
  created_at: string
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getDomain(url: string) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

const EVENT_DOT: Record<ChangelogEvent['event_type'], string> = {
  added:       'bg-[var(--color-success)]',
  reextracted: 'bg-[var(--color-running)]',
  deleted:     'bg-muted-foreground/30',
}

const EVENT_LABEL: Record<ChangelogEvent['event_type'], string> = {
  added:       'Added',
  reextracted: 'Updated',
  deleted:     'Removed',
}

const EVENT_TEXT: Record<ChangelogEvent['event_type'], string> = {
  added:       'text-[var(--color-success)]/70',
  reextracted: 'text-[var(--color-running)]/70',
  deleted:     'text-muted-foreground/35',
}

export function ChangelogActivity() {
  const [events, setEvents] = useState<ChangelogEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [, setNow] = useState(Date.now())

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog?limit=20')
      const data = await res.json()
      setEvents(data.events ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Refresh relative timestamps every minute
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (loading) {
    return (
      <div className="space-y-px">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border/30 animate-pulse">
            <div className="w-1.5 h-1.5 rounded-full bg-muted shrink-0" />
            <div className="h-3 bg-muted rounded w-32" />
            <div className="h-3 bg-muted rounded w-16 ml-auto" />
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return <p className="text-[12px] font-mono text-muted-foreground/40">No activity yet.</p>
  }

  return (
    <div>
      <div className="space-y-px">
        {events.map(ev => (
          <div key={ev.id} className="flex items-center gap-3 py-3 border-b border-border/25 group">
            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${EVENT_DOT[ev.event_type]}`} />
            <span className="text-[12.5px] text-foreground/65 truncate min-w-0 flex-1">
              {ev.source_name || getDomain(ev.source_url)}
            </span>
            <span className={`shrink-0 text-[9px] font-mono uppercase tracking-[0.06em] ${EVENT_TEXT[ev.event_type]}`}>
              {EVENT_LABEL[ev.event_type]}
            </span>
            <span className="shrink-0 text-[10px] font-mono text-muted-foreground/30 tabular-nums w-16 text-right">
              {timeAgo(ev.created_at)}
            </span>
          </div>
        ))}
      </div>
      {total > 20 && (
        <p className="text-[10px] font-mono text-muted-foreground/25 mt-4">
          Showing 20 of {total} events
        </p>
      )}
    </div>
  )
}
