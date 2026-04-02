'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from '@phosphor-icons/react'

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

const EVENT_STYLES = {
  added:       'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  reextracted: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  deleted:     'bg-muted text-muted-foreground',
}

export default function ChangelogPage() {
  const [events, setEvents] = useState<ChangelogEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async (offset = 0, append = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/changelog?limit=50&offset=${offset}`)
      const data = await res.json()
      setEvents(prev => append ? [...prev, ...data.events] : data.events)
      setTotal(data.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="h-14 px-5 md:px-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-medium tracking-[-0.01em]">Hitman's Library</h1>
            <span className="text-[10px] font-mono uppercase tracking-[0.12em] text-muted-foreground border border-border/60 px-1.5 py-0.5 rounded-[3px]">
              Changelog
            </span>
          </div>
          <Link href="/" className="flex items-center gap-1.5 text-[12px] font-mono text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" weight="regular" />
            Gallery
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 md:px-7 py-8">
        {loading && events.length === 0 ? (
          <div className="flex justify-center py-16">
            <span className="text-[12px] font-mono text-muted-foreground">Loading…</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-[13px] font-mono text-muted-foreground">No events yet.</p>
        ) : (
          <>
            <div className="space-y-px">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-4 py-3 border-b border-border/30">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[3px] shrink-0 ${EVENT_STYLES[ev.event_type]}`}>
                    {ev.event_type}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate tracking-[-0.01em]">{ev.source_name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground truncate">{getDomain(ev.source_url)}</p>
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">{timeAgo(ev.created_at)}</span>
                </div>
              ))}
            </div>

            {events.length < total && (
              <div className="flex justify-center pt-6">
                <button
                  onClick={() => load(events.length, true)}
                  disabled={loading}
                  className="h-8 px-4 text-[12px] font-mono border border-border/60 rounded-sm hover:bg-muted transition-colors disabled:opacity-40"
                >
                  {loading ? 'Loading…' : `Load more (${total - events.length} remaining)`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
