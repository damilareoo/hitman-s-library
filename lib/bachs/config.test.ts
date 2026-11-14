import { describe, expect, test } from 'bun:test'
import { bachsApiBase, bachsProducts, isBachsCheckoutUrl } from './config'

describe('bachs config', () => {
  test('the key picks the API', () => {
    expect(bachsApiBase('sk_live_x')).toBe('https://api.bachs.io')
    expect(bachsApiBase('sk_sandbox_x')).toBe('https://sandbox-api.bachs.io')
  })
  test('products need both ids', () => {
    expect(bachsProducts({ BACHS_PRO_MONTHLY: 'prod_a', BACHS_PRO_YEARLY: 'prod_b' })).toEqual({ month: 'prod_a', year: 'prod_b' })
    expect(bachsProducts({ BACHS_PRO_MONTHLY: 'prod_a' })).toBeNull()
    expect(bachsProducts({ BACHS_PRO_MONTHLY: 'x', BACHS_PRO_YEARLY: 'prod_b' })).toBeNull()
  })
  test('only Bachs-hosted https pages', () => {
    expect(isBachsCheckoutUrl('https://checkout.bachs.io/c/abc')).toBe(true)
    expect(isBachsCheckoutUrl('http://checkout.bachs.io/c/abc')).toBe(false)
    expect(isBachsCheckoutUrl('https://bachs.io.evil.example/c')).toBe(false)
    expect(isBachsCheckoutUrl('javascript:alert(1)')).toBe(false)
  })
})
