// lib/paddle/config.ts
// Public Paddle identifiers. The client-side token is designed to ship to
// browsers; the API key and webhook secret are Worker secrets, never here.
export const PADDLE = {
  environment: 'sandbox' as 'sandbox' | 'production',
  clientToken: 'test_03f146ded9ccd77289903f3dbae',
  productId: 'pro_01m7a4xqgv5fsvhbjf2et7ynzt',
  prices: { month: 'pri_01m7a4xrd86as5hd4d57gpg889', year: 'pri_01m7a4xrpsaf70zbtn8yk1t14c' },
}
export const PADDLE_API = PADDLE.environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com'
