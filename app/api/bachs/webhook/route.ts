// app/api/bachs/webhook/route.ts
// Bachs → us: subscription changes. Verified, idempotent and order-safe;
// see lib/bachs/webhook.ts. A 500 makes Bachs retry, which is what we want
// when the database is briefly unavailable.
import { handleBachsWebhook } from '@/lib/bachs/webhook'
import { applySubscriptionEvent } from '@/lib/billing/apply'
import { problem } from '@/lib/auth/request'
import { sendProWelcome } from '@/lib/email/send-pro-welcome'

// guard: none — every request must carry a valid, fresh HMAC signature from Bachs
export async function POST(req: Request) {
  try {
    return await handleBachsWebhook(req, {
      secret: process.env.BACHS_WEBHOOK_SECRET ?? '',
      now: () => Math.floor(Date.now() / 1000),
      apply: (id, row, at) => applySubscriptionEvent(id, row, at, 'bachs'),
      welcome: sendProWelcome,
    })
  } catch (err) {
    console.error('[bachs webhook]', err)
    return problem(500, 'unavailable')
  }
}
