// app/api/paddle/webhook/route.ts
// Paddle → us: subscription changes. Verified, idempotent and order-safe;
// see lib/paddle/webhook.ts. A 500 makes Paddle retry, which is what we want
// when the database is briefly unavailable.
import { handleWebhook } from '@/lib/paddle/webhook'
import { applySubscriptionEvent } from '@/lib/paddle/apply'
import { problem } from '@/lib/auth/request'

// guard: none — every request must carry a valid HMAC signature from Paddle (checked first in handleWebhook)
export async function POST(req: Request) {
  try {
    return await handleWebhook(req, {
      secret: process.env.PADDLE_WEBHOOK_SECRET ?? '',
      now: () => Math.floor(Date.now() / 1000),
      apply: applySubscriptionEvent,
    })
  } catch (err) {
    console.error('[paddle webhook]', err)
    return problem(500, 'unavailable')
  }
}
