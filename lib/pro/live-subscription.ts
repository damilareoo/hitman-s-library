// lib/pro/live-subscription.ts
// A subscription Bachs may still bill: active, trialing, or past due.
import { getSql } from '@/lib/db'

export async function hasLiveSubscription(userId: string): Promise<boolean> {
  const rows = await getSql()`SELECT 1 FROM subscriptions WHERE user_id = ${userId} AND status IN ('active', 'trialing', 'past_due')`
  return rows.length > 0
}
