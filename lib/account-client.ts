// lib/account-client.ts
//
// The browser's view of the account. Pages are anonymous and cached, so the
// browser asks /api/me who is signed in. Once signed in, this device's hearts
// and collections merge into the account and the merged set comes back —
// the same union on every device. Later changes sync after a short pause.
'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { COLLECTIONS_EVENT } from '@/lib/collections'

export const FAVORITES_EVENT = 'hl:favorites-changed'
export const SIGN_IN_EVENT = 'hl:sign-in'
/** Fired after a style kit download, so the meter re-reads /api/me. */
/** Fired when membership may have changed (e.g. after checkout): reload who is signed in. */
export const ACCOUNT_EVENT = 'hl:account-changed'

export interface AccountUser { email: string; name: string | null; avatar: string | null; memberNo: number; since: string; google: boolean }
type State = { status: 'loading' | 'signed-out' | 'signed-in'; user: AccountUser | null; pro?: boolean; paddleCustomerId?: string | null; watching?: number[] }

const LOADING: State = { status: 'loading', user: null }
let state: State = LOADING
const listeners = new Set<() => void>()
const set = (next: State) => { state = next; listeners.forEach(l => l()) }

type Saved = { favorite_ids: number[]; collections: Record<string, number[]> }
function readLocal(): Saved {
  const parse = (key: string, fallback: unknown) => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback } catch { return fallback }
  }
  return { favorite_ids: parse('hl:favorites', []), collections: parse('hl:collections', {}) }
}

let adopting = false
function adopt(data: Saved) {
  adopting = true
  try {
    localStorage.setItem('hl:favorites', JSON.stringify(data.favorite_ids))
    localStorage.setItem('hl:collections', JSON.stringify(data.collections))
  } catch { /* storage unavailable */ }
  window.dispatchEvent(new CustomEvent(FAVORITES_EVENT))
  window.dispatchEvent(new CustomEvent(COLLECTIONS_EVENT))
  adopting = false
}

// Bumped on sign-out and delete, so a sync already in flight can't write back.
let generation = 0
let lastSent = ''
const mergedKey = () => `hl:merged:${state.user?.memberNo ?? ''}`

async function sync(): Promise<void> {
  if (state.status !== 'signed-in') return
  const data = readLocal()
  const body = JSON.stringify(data)
  if (body === lastSent) return
  // The first sync on this device merges with the account; after that this
  // device's state is the truth, so removals stick.
  let mode: 'merge' | 'replace' = 'replace'
  try { mode = localStorage.getItem(mergedKey()) ? 'replace' : 'merge' } catch { /* storage unavailable */ }
  const gen = generation
  const res = await fetch('/api/me/sync', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data, mode }),
  }).catch(() => null)
  if (gen !== generation) return
  if (res?.status === 401) return set({ status: 'signed-out', user: null })
  if (!res?.ok) return
  const merged: Saved = (await res.json()).data
  if (gen !== generation) return
  try { localStorage.setItem(mergedKey(), '1') } catch { /* storage unavailable */ }
  lastSent = JSON.stringify(merged)
  if (mode === 'merge') adopt(merged)
}

let syncTimer: ReturnType<typeof setTimeout> | undefined
function scheduleSync() {
  if (adopting || state.status !== 'signed-in') return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { void sync() }, 1500)
}

const signedInHint = () => /(?:^|;\s*)hl_signed_in=1/.test(document.cookie)

async function load() {
  // Signed-out visitors never make a request: the hint cookie says whether to ask.
  if (!signedInHint()) return set({ status: 'signed-out', user: null })
  const body = await fetch('/api/me', { credentials: 'same-origin' }).then(r => r.json()).catch(() => ({ user: null }))
  if (!body.user) return set({ status: 'signed-out', user: null })
  set({ status: 'signed-in', user: body.user, pro: Boolean(body.pro), paddleCustomerId: body.paddleCustomerId ?? null, watching: Array.isArray(body.watching) ? body.watching : [] })
  await sync()
}

let started = false
function start() {
  if (started || typeof window === 'undefined') return
  started = true
  void load()
  window.addEventListener(FAVORITES_EVENT, scheduleSync)
  window.addEventListener(COLLECTIONS_EVENT, scheduleSync)
  window.addEventListener(ACCOUNT_EVENT, () => { void load() })
  // Back/forward cache and other tabs: re-check when the page comes back.
  window.addEventListener('pageshow', e => { if ((e as PageTransitionEvent).persisted) void load() })
}

export function useAccount(): State {
  useEffect(start, [])
  return useSyncExternalStore(
    l => { listeners.add(l); return () => listeners.delete(l) },
    () => state,
    () => LOADING,
  )
}

/**
 * Open the sign-in sheet. 'join' frames it for someone new (from a save);
 * 'signin' for someone returning (from the header). Same flow either way —
 * an email link or Google signs in or creates the account.
 */
export function openSignIn(mode: 'signin' | 'join' = 'signin') {
  window.dispatchEvent(new CustomEvent(SIGN_IN_EVENT, { detail: { mode } }))
}

/** Forget this account's saves on this device: they live in the account now. */
function forgetLocal() {
  generation++
  clearTimeout(syncTimer)
  lastSent = ''
  adopt({ favorite_ids: [], collections: {} })
}

export async function signOut(): Promise<void> {
  clearTimeout(syncTimer)
  await sync() // the last change reaches the account first
  await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => null)
  forgetLocal()
  set({ status: 'signed-out', user: null })
}

/** 'subscribed' when a Pro subscription must be cancelled first. */
export async function deleteAccount(): Promise<'ok' | 'subscribed' | 'failed'> {
  const res = await fetch('/api/me', { method: 'DELETE' }).catch(() => null)
  if (res?.status === 409) return 'subscribed'
  if (!res?.ok) return 'failed'
  forgetLocal()
  set({ status: 'signed-out', user: null })
  return 'ok'
}

/** Watch or unwatch a site for redesigns (Pro). Optimistic; rolls back if refused. */
export async function setWatching(siteId: number, on: boolean): Promise<boolean> {
  const before = state.watching ?? []
  set({ ...state, watching: on ? [...new Set([...before, siteId])] : before.filter(id => id !== siteId) })
  const res = await fetch('/api/watch', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ siteId, on }),
  }).catch(() => null)
  if (res?.ok) return true
  set({ ...state, watching: before })
  return false
}
