// lib/pro/entitlement.ts
//
// Who is Pro. The pro_users view (migration 028, grace in 030) is the one
// definition: a live paid subscription or a complimentary team grant.
import type { NeonQueryFunction } from '@neondatabase/serverless'
import { getSql } from '@/lib/db'

export interface EntitlementDeps {
  sql: NeonQueryFunction<false, false>
  now: () => Date
}

const defaultDeps = (): EntitlementDeps => ({ sql: getSql(), now: () => new Date() })

export interface SubscriptionState { status: string | null; current_period_end: Date | string | null }

/** Bachs charges at the period end and tells us after; a day's grace covers the gap. */
export const RENEWAL_GRACE_MS = 24 * 60 * 60 * 1000

/** Pro while the subscription is active (or trialing) and its paid period (plus a day's grace) hasn't ended. The pro_users view applies the same rule in SQL. */
export function isPro(sub: SubscriptionState | null, now: Date): boolean {
  if (!sub || (sub.status !== 'active' && sub.status !== 'trialing')) return false
  if (sub.current_period_end == null) return true
  return new Date(sub.current_period_end).getTime() + RENEWAL_GRACE_MS > now.getTime()
}

export interface Entitlement { pro: boolean }

export async function getEntitlement(userId: string, deps: EntitlementDeps = defaultDeps()): Promise<Entitlement> {
  const [row] = await deps.sql`SELECT EXISTS (SELECT 1 FROM pro_users p WHERE p.user_id = ${userId}) AS pro`
  return { pro: Boolean(row?.pro) }
}
