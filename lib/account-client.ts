// lib/account-client.ts
//
// The browser's view of the account. Pages are anonymous and cached, so the
// browser asks /api/me who is signed in. Once signed in, this device's hearts
// and collections merge into the account and the merged set comes back —
// the same union on every device. Later changes sync after a short pause.
'use client'

import { useSyncExternalStore } from 'react'
import { COLLECTIONS_EVENT } from '@/lib/collections'

export const FAVORITES_EVENT = 'hl:favorites-changed'
export const SIGN_IN_EVENT = 'hl:sign-in'

export interface AccountUser { email: string; name: string | null; avatar: string | null; memberNo: number }
type State = { status: 'loading' | 'signed-out' | 'signed-in'; user: AccountUser | null }

let state: State = { status: 'loading', user: null }
const listeners = new Set<() => void>()
const set = (next: State) => { state = next; listeners.forEach(l => l()) }

function readLocal(): { favorite_ids: number[]; collections: Record<string, number[]> } {
  const parse = (key: string, fallback: unknown) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
  }
  return { favorite_ids: parse('hl:favorites', []), collections: parse('hl:collections', {}) }
}

let adopting = false
function adopt(data: { favorite_ids: number[]; collections: Record<string, number[]> }) {
  adopting = true
  try {
    localStorage.setItem('hl:favorites', JSON.stringify(data.favorite_ids))
    localStorage.setItem('hl:collections', JSON.stringify(data.collections))
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT))
  window.dispatchEvent(new CustomEvent(COLLECTIONS_EVENT))
  adopting = false
}

async function sync(): Promise<void> {
  const res = await fetch('/api/me/sync', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(readLocal()),
  }).catch(() => null)
  if (res?.ok) adopt((await res.json()).data)
}

let syncTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSync() {
  if (adopting || state.status !== 'signed-in') return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { void sync() }, 1500)
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  fetch('/api/me', { credentials: 'same-origin' })
    .then(r => r.json())
    .then(async (body: { user: AccountUser | null }) => {
      if (!body.user) return set({ status: 'signed-out', user: null })
      set({ status: 'signed-in', user: body.user })
      await sync()
    })
    .catch(() => set({ status: 'signed-out', user: null }))
  window.addEventListener(FAVORITES_EVENT, scheduleSync)
  window.addEventListener(COLLECTIONS_EVENT, scheduleSync)
}

export function useAccount(): State {
  start()
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
    () => state,
  )
}

/** Open the sign-in sheet. `next` is where to land afterwards. */
export function openSignIn(reason?: string) {
  window.dispatchEvent(new CustomEvent(SIGN_IN_EVENT, { detail: { reason } }))
}

export async function signOut(): Promise<void> {
  await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => null)
  set({ status: 'signed-out', user: null })
}

export async function deleteAccount(): Promise<boolean> {
  const res = await fetch('/api/me', { method: 'DELETE' }).catch(() => null)
  if (res?.ok) set({ status: 'signed-out', user: null })
  return Boolean(res?.ok)
}
