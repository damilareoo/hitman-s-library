// lib/taste.ts
// Taste radar (server-only): taste vectors as averaged favorite embeddings,
// subscriber writes, and the weekly digest query. No auth on subscribe —
// email + token carry it, like site requests.
import { randomUUID } from 'node:crypto'
import { getSql } from '@/lib/db'
import { toVectorLiteral } from '@/lib/similarity'

const sql = getSql()

/** Mean of the given sites' embeddings as a vector literal, or null. */
export async function tasteVectorFor(siteIds: number[]): Promise<string | null> {
  const ids = [...new Set(siteIds.filter(Number.isFinite))].slice(0, 100)
  if (ids.length === 0) return null
  try {
    const rows = await sql`
      SELECT embedding::text AS e FROM design_sources
      WHERE id = ANY(${ids}::int[]) AND embedding IS NOT NULL
    `
    const vecs = rows
      .map(r => String(r.e ?? '').slice(1, -1).split(',').map(Number))
      .filter(v => v.length > 0 && v.every(Number.isFinite))
    if (vecs.length === 0) return null
    const dims = vecs[0].length
    if (!vecs.every(v => v.length === dims)) return null
    const mean = vecs[0].map((_, i) => vecs.reduce((s, v) => s + v[i], 0) / vecs.length)
    return toVectorLiteral(mean)
  } catch (err) {
    console.error('[taste] vector failed:', err)
    return null
  }
}

export interface SubscribeResult {
  ok: boolean
  error?: string
}

/** Per-site favorite counts across subscribers (aggregate only — never who).
 *  Hearts are otherwise private: they tune the owner's digest vector. */
export async function favoriteCounts(siteIds: number[]): Promise<Map<number, number>> {
  const out = new Map<number, number>()
  const ids = [...new Set(siteIds.filter(Number.isFinite))]
  if (ids.length === 0) return out
  try {
    const rows = await sql`
      SELECT fav AS id, COUNT(*) AS c
      FROM taste_subscribers, LATERAL unnest(favorite_ids) AS fav
      WHERE fav = ANY(${ids}::int[])
      GROUP BY fav
    `
    for (const r of rows) out.set(Number(r.id), Number(r.c))
  } catch (err) {
    console.error('[taste] counts failed:', err)
  }
  return out
}
/** Upsert by email: favorites + re-averaged vector, fresh token on create. */
export async function subscribe(email: string, favoriteIds: number[]): Promise<SubscribeResult> {
  const vector = await tasteVectorFor(favoriteIds)
  if (!vector) return { ok: false, error: 'Favorite at least one site with an embedding first.' }
  try {
    await sql`
      INSERT INTO taste_subscribers (email, taste_vector, favorite_ids, unsub_token)
      VALUES (${email}, ${vector}::vector, ${favoriteIds}::int[], ${randomUUID()})
      ON CONFLICT (email) DO UPDATE SET
        taste_vector = EXCLUDED.taste_vector,
        favorite_ids = EXCLUDED.favorite_ids
    `
    return { ok: true }
  } catch (err) {
    console.error('[taste] subscribe failed:', err)
    return { ok: false, error: 'Could not save. Try again.' }
  }
}
