// lib/pro/entitlement.ts
//
// Who is Pro, and the free style-kit meter: three kits a month for a free
// account, unlimited for Pro. A kit counts once per site per calendar month
// (UTC), so downloading the same site again is free. The month and the count
// always come from the database, never the browser.
//
// Claims run in one transaction behind a per-user advisory lock: two downloads
// fired at once by someone on 2 of 3 can't both slip under the limit. Each
// statement in the transaction takes a fresh snapshot, so the claim sees any
// row the other request committed while this one waited on the lock.
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { getSql } from '@/lib/db'

export const KIT_LIMIT = 3

export interface EntitlementDeps {
  sql: NeonQueryFunction<false, false>
  now: () => Date
}

const defaultDeps = (): EntitlementDeps => ({ sql: getSql(), now: () => new Date() })

export interface SubscriptionState { status: string | null; current_period_end: Date | string | null }

/** Paddle charges at the period end and tells us after; a day's grace covers the gap. */
export const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000

/** Pro while the subscription is active (or trialing) and its paid period (plus a day's grace) hasn't ended. The pro_users view applies the same rule in SQL. */
export function isPro(sub: SubscriptionState | null, now: Date): boolean {
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return false
  if (sub.current_period_end == null) return true
  return new Date(sub.current_period_end).getTime() + RENEWAL_GRACE_MS > now.getTime()
}

export interface Entitlement { pro: boolean; kitsUsed: number; kitsLimit: number }

export async function getEntitlement(userId: string, deps: EntitlementDeps = defaultDeps()): Promise<Entitlement> {
  // pro_users (migration 028) is the one definition of Pro: a live paid
  // subscription (isPro's rule) or a complimentary team grant.
  const [row] = await deps.sql`
    SELECT EXISTS (SELECT 1 FROM pro_users p WHERE p.user_id = ${userId}) AS pro,
           (SELECT count(*)::int FROM kit_downloads k
             WHERE k.user_id = ${userId} AND k.month = date_trunc('month', now() AT TIME ZONE 'utc')::date) AS used`
  return { pro: Boolean(row?.pro), kitsUsed: Number(row?.used ?? 0), kitsLimit: KIT_LIMIT }
}

export type KitClaim =
  | { ok: true; counted: boolean; kitsUsed: number }
  | { ok: false; reason: 'limit'; kitsUsed: number }

export async function claimKit(userId: string, sourceId: number, deps: EntitlementDeps = defaultDeps()): Promise<KitClaim> {
  const { sql } = deps
  const [, rows] = await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext('kit:' || ${userId}))`,
    sql`
      WITH m AS (SELECT date_trunc('month', now() AT TIME ZONE 'utc')::date AS month),
      pro AS (SELECT EXISTS (SELECT 1 FROM pro_users p WHERE p.user_id = ${userId}) AS pro),
      prior AS (
        SELECT count(*)::int AS used, coalesce(bool_or(k.source_id = ${sourceId}), false) AS had
          FROM kit_downloads k, m WHERE k.user_id = ${userId} AND k.month = m.month
      ),
      ins AS (
        INSERT INTO kit_downloads (user_id, source_id, month)
        SELECT ${userId}, ${sourceId}, m.month FROM m, pro, prior
         WHERE NOT prior.had AND (pro.pro OR prior.used < ${KIT_LIMIT})
        ON CONFLICT DO NOTHING
        RETURNING 1
      )
      SELECT pro.pro, prior.used, prior.had, (SELECT count(*)::int FROM ins) AS inserted FROM pro, prior`,
  ]) as [unknown, Array<{ pro: boolean; used: number; had: boolean; inserted: number }>]
  const r = rows[0]
  const used = Number(r.used), inserted = Number(r.inserted)
  if (r.had) return { ok: true, counted: false, kitsUsed: used }
  if (inserted) return { ok: true, counted: true, kitsUsed: used + 1 }
  return { ok: false, reason: 'limit', kitsUsed: used }
}
