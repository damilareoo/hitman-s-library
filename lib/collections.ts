// lib/collections.ts
// Named site sets (client-only): the Save destination behind hearts. No
// account wall — sets live in localStorage under one key, and the grid reads
// them back through the existing ids filter. A set shared to another device
// opens empty there; the empty state says so instead of pretending.
'use client'

import { useState, useEffect, useCallback } from 'react'

const KEY = 'hl:collections'
export const COLLECTIONS_EVENT = 'hl:collections-changed'

export type CollectionMap = Record<string, number[]>

function read(): CollectionMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: CollectionMap = {}
    for (const [name, ids] of Object.entries(parsed as Record<string, unknown>)) {
      if (!name.trim() || name.length > 40) continue
      out[name] = Array.isArray(ids) ? ids.map(Number).filter(Number.isFinite).slice(0, 500) : []
    }
    return out
  } catch {
    return {}
  }
}

function write(map: CollectionMap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map))
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(COLLECTIONS_EVENT))
}

export function sanitizeName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ').slice(0, 40)
  return name || null
}

/** Toggle one site's membership. Creates the set when missing. */
export function toggleMembership(name: string, id: number): CollectionMap {
  const map = read()
  const list = map[name] ?? []
  map[name] = list.includes(id) ? list.filter(f => f !== id) : [...list, id]
  write(map)
  return map
}

export function deleteCollection(name: string): CollectionMap {
  const map = read()
  delete map[name]
  write(map)
  return map
}

export function useCollections(): [CollectionMap, () => void] {
  const [map, setMap] = useState<CollectionMap>({})
  const refresh = useCallback(() => setMap(read()), [])
  useEffect(() => {
    refresh()
    window.addEventListener('storage', refresh)
    window.addEventListener(COLLECTIONS_EVENT, refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('COLLECTIONS_EVENT', refresh)
    }
  }, [refresh])
  return [map, refresh]
}
