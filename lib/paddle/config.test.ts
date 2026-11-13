import { describe, expect, test } from 'bun:test'
import { PADDLE, PADDLE_API } from './config'

describe('Paddle config', () => {
  test('API host matches the environment', () => {
    expect(PADDLE_API).toBe(PADDLE.environment === 'sandbox' ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com')
  })
  test('the client token matches the environment, and every id is filled', () => {
    expect(PADDLE.clientToken.startsWith(PADDLE.environment === 'sandbox' ? 'test_' : 'live_')).toBe(true)
    expect(PADDLE.productId).toMatch(/^pro_/)
    expect(PADDLE.prices.month).toMatch(/^pri_/)
    expect(PADDLE.prices.year).toMatch(/^pri_/)
  })
})
