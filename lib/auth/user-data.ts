// lib/auth/user-data.ts
//
// Hearts and collections for a signed-in person. The first sync on a device
// merges (a union), so signing in never loses anything either side saved.
// After that, the device's state replaces the account's, so un-hearting or
// deleting a set sticks. Input is untrusted: cleaned to the limits the
// browser's own storage uses, plus Postgres int range.

export interface UserData { favorite_ids: number[]; collections: Record<string, number[]> }

const MAX_HEARTS = 5000
const MAX_SETS = 500
const MAX_PER_SET = 500
const INT_MAX = 2_147_483_647

const ids = (v: unknown, cap: number): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((n): n is number => Number.isSafeInteger(n) && n > 0 && n <= INT_MAX))].slice(0, cap) : []

export function sanitizeUserData(raw: unknown): UserData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  // Own keys only, into a plain record: 'constructor' or '__proto__' are just names.
  const collections: Record<string, number[]> = Object.create(null)
  const sets = r.collections && typeof r.collections === 'object' && !Array.isArray(r.collections) ? r.collections as Record<string, unknown> : {}
  for (const name of Object.keys(sets)) {
    if (Object.keys(collections).length >= MAX_SETS) break
    const list = sets[name]
    if (!name.trim() || name.length > 40 || name === '__proto__' || !Array.isArray(list)) continue
    collections[name] = ids(list, MAX_PER_SET)
  }
  return { favorite_ids: ids(r.favorite_ids, MAX_HEARTS), collections: { ...collections } }
}

export function mergeUserData(server: UserData, local: UserData): UserData {
  // Local first, so if a cap ever bites it is the account's extras that wait, not this device's.
  const collections: Record<string, number[]> = Object.create(null)
  for (const [name, list] of Object.entries(local.collections)) collections[name] = list
  for (const [name, list] of Object.entries(server.collections)) {
    collections[name] = Object.hasOwn(collections, name) ? [...new Set([...list, ...collections[name]])] : list
  }
  return sanitizeUserData({ favorite_ids: [...local.favorite_ids, ...server.favorite_ids], collections: { ...collections } })
}

export function nextUserData(server: UserData, local: UserData, mode: 'merge' | 'replace'): UserData {
  return mode === 'merge' ? mergeUserData(server, local) : sanitizeUserData(local)
}
