// lib/auth/user-data.ts
//
// Hearts and collections for a signed-in person. Signing in on a new device
// merges what that device saved locally with the account: a union, so nothing
// anyone saved is ever lost. Input is untrusted and cleaned to the same limits
// the browser's own storage uses (lib/collections.ts).

export interface UserData { favorite_ids: number[]; collections: Record<string, number[]> }

const MAX_HEARTS = 2000
const MAX_SETS = 100
const MAX_PER_SET = 500

const ids = (v: unknown, cap: number): number[] =>
  Array.isArray(v) ? [...new Set(v.filter((n): n is number => Number.isSafeInteger(n) && n > 0))].slice(0, cap) : []

export function sanitizeUserData(raw: unknown): UserData {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const collections: Record<string, number[]> = {}
  const sets = r.collections && typeof r.collections === 'object' && !Array.isArray(r.collections) ? r.collections as Record<string, unknown> : {}
  for (const [name, list] of Object.entries(sets)) {
    if (Object.keys(collections).length >= MAX_SETS) break
    if (!name.trim() || name.length > 40 || !Array.isArray(list)) continue
    collections[name] = ids(list, MAX_PER_SET)
  }
  return { favorite_ids: ids(r.favorite_ids, MAX_HEARTS), collections }
}

export function mergeUserData(server: UserData, local: UserData): UserData {
  const collections: Record<string, number[]> = { ...server.collections }
  for (const [name, list] of Object.entries(local.collections)) {
    collections[name] = [...new Set([...(collections[name] ?? []), ...list])].slice(0, MAX_PER_SET)
  }
  return sanitizeUserData({ favorite_ids: [...local.favorite_ids, ...server.favorite_ids], collections })
}
