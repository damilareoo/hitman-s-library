'use client'

import { useCallback, useEffect, useState } from 'react'
import { normalizeUrl } from './normalize-url'

const STORAGE_KEY = 'hl_site_requests'
const MAX_REMEMBERED = 25

export interface RememberedRequest {
  url: string
  normalized: string
  title: string | null
  requestedAt: number
  /** Filled in from the server on load — never trusted from storage. */
  status?: 'pending' | 'added' | 'dismissed'
  sourceId?: string | null
  siteTitle?: string | null
}

function read(): RememberedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(entries: RememberedRequest[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_REMEMBERED)))
  } catch {
    // Private browsing, or a full quota. Losing the local record is a smaller
    // problem than throwing inside a click handler.
  }
}

/**
 * Remembers what this browser has asked for, and asks the server what became
 * of it.
 *
 * There are no accounts, so the request is the only thing tying a person to
 * their suggestion. Without this the flow ends at "thanks" and they never learn
 * whether it worked — which is the difference between submitting into a void
 * and making a request.
 */
export function useSiteRequests() {
  const [requests, setRequests] = useState<RememberedRequest[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = read()
    setRequests(stored)
    setLoaded(true)
    if (stored.length === 0) return

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/request/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: stored.map(r => r.normalized) }),
        })
        if (!res.ok) return
        const { statuses } = await res.json()
        if (cancelled) return

        setRequests(prev => {
          const merged = prev.map(entry => {
            const live = statuses?.[entry.normalized]
            if (!live) return entry
            return {
              ...entry,
              status: live.status,
              sourceId: live.sourceId ?? null,
              siteTitle: live.title ?? null,
            }
          })
          write(merged)
          return merged
        })
      } catch {
        // Offline, or the endpoint is down. The stored list still renders.
      }
    })()

    return () => { cancelled = true }
  }, [])

  const remember = useCallback((url: string, title: string | null) => {
    const normalized = normalizeUrl(url)
    setRequests(prev => {
      const without = prev.filter(r => r.normalized !== normalized)
      const next = [{ url, normalized, title, requestedAt: Date.now(), status: 'pending' as const }, ...without]
      write(next)
      return next
    })
  }, [])

  const forget = useCallback((normalized: string) => {
    setRequests(prev => {
      const next = prev.filter(r => r.normalized !== normalized)
      write(next)
      return next
    })
  }, [])

  return { requests, remember, forget, loaded }
}
