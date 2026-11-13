// lib/paddle/config.ts
// Public Paddle identifiers for each environment. Client-side tokens are
// designed to ship to browsers; API keys and webhook secrets are Worker
// secrets, never here. Going live = filling LIVE (from
// `node scripts/paddle-setup.mjs --live`) and flipping ENVIRONMENT.
type Env = 'sandbox' | 'production'

const ENVIRONMENT: Env = 'production'

const IDS: Record<Env, { clientToken: string; productId: string; prices: { month: string; year: string } }> = {
  sandbox: {
    clientToken: 'test_03f146ded9ccd77289903f3dbae',
    productId: 'pro_01m7a4xqgv5fsvhbjf2et7ynzt',
    prices: { month: 'pri_01m7a4xrd86as5hd4d57gpg889', year: 'pri_01m7a4xrpsaf70zbtn8yk1t14c' },
  },
  production: {
    clientToken: 'live_cdcb0228ae2aad9de1fd3db6fec',
    productId: 'pro_01m7a9mztba1jas79ak41cad00',
    prices: { month: 'pri_01m7a9n1629c73425vfqmtq10p', year: 'pri_01m7a9n1mvwjq3ratz3qazf2bw' },
  },
}

export const PADDLE = { environment: ENVIRONMENT, ...IDS[ENVIRONMENT] }
export const PADDLE_API = ENVIRONMENT === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
/** Worker secret names for this environment, so live and sandbox keys never overwrite each other. */
export const PADDLE_SECRETS = ENVIRONMENT === 'sandbox'
  ? { apiKey: 'PADDLE_API_KEY', webhookSecret: 'PADDLE_WEBHOOK_SECRET' }
  : { apiKey: 'PADDLE_API_KEY_LIVE', webhookSecret: 'PADDLE_WEBHOOK_SECRET_LIVE' }
