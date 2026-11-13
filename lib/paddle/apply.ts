// lib/paddle/apply.ts
// The one statement that applies a Paddle subscription event: the event id
// is recorded and the row written together, only for a user that exists, and
// only if this event is not older than the one already applied.
import { getSql } from '@/lib/db'
import type { SubscriptionRow } from './webhook'

export async function applySubscriptionEvent(eventId: string, row: SubscriptionRow, occurredAt: string): Promise<void> {
  await getSql()`
    WITH ev AS (
      INSERT INTO paddle_events (id) VALUES (${eventId}) ON CONFLICT DO NOTHING RETURNING id
    )
    INSERT INTO subscriptions (user_id, status, plan, interval, current_period_end, provider,
                               provider_customer_id, provider_subscription_id, provider_updated_at, updated_at)
    SELECT u.id, ${row.status}, ${row.plan}, ${row.interval}, ${row.currentPeriodEnd}::timestamptz, 'paddle',
           ${row.providerCustomerId}, ${row.providerSubscriptionId}, ${occurredAt}::timestamptz, now()
      FROM users u, ev
     WHERE u.id = ${row.userId}::uuid
    ON CONFLICT (user_id) DO UPDATE SET
      status = EXCLUDED.status, plan = EXCLUDED.plan, interval = EXCLUDED.interval,
      current_period_end = EXCLUDED.current_period_end, provider = EXCLUDED.provider,
      provider_customer_id = EXCLUDED.provider_customer_id,
      provider_subscription_id = EXCLUDED.provider_subscription_id,
      provider_updated_at = EXCLUDED.provider_updated_at, updated_at = now()
    WHERE subscriptions.provider_updated_at IS NULL OR subscriptions.provider_updated_at <= EXCLUDED.provider_updated_at`
}
