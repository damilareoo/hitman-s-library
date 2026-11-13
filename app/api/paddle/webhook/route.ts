// app/api/paddle/webhook/route.ts
// Paddle → us: subscription changes. Verified, idempotent and order-safe;
// see lib/paddle/webhook.ts. A 500 makes Paddle retry, which is what we want
// when the database is briefly unavailable.
import { handleWebhook } from '@/lib/paddle/webhook'
import { applySubscriptionEvent } from '@/lib/paddle/apply'
import { problem } from '@/lib/auth/request'
import { inCidrs, paddleIps } from '@/lib/paddle/ips'
import { PADDLE_SECRETS } from '@/lib/paddle/config'

// guard: none — only Paddle's published IPs are accepted, and every request must carry a valid HMAC signature
export async function POST(req: Request) {
  try {
    return await handleWebhook(req, {
      // Cloudflare sets cf-connecting-ip to the real sender; it can't be forged from outside.
      source: async r => {
        const cidrs = await paddleIps()
        if (!cidrs.length) return 'unknown'
        return inCidrs(r.headers.get('cf-connecting-ip') ?? '', cidrs) ? 'yes' : 'no'
      },
      secret: process.env[PADDLE_SECRETS.webhookSecret] ?? '',
      now: () => Math.floor(Date.now() / 1000),
      apply: applySubscriptionEvent,
    })
  } catch (err) {
    console.error('[paddle webhook]', err)
    return problem(500, 'unavailable')
  }
}
