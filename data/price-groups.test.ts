import { describe, expect, test } from 'bun:test'
import { PRICES, DEFAULT_INTERVAL } from './price-groups'

describe('Pro pricing', () => {
  test('one price everywhere: $5 a month, $48 a year', () => {
    expect(PRICES).toEqual({ month: 500, year: 4800 })
  })
  test('yearly saves 20%', () => {
    expect(Math.round((1 - PRICES.year / (PRICES.month * 12)) * 100)).toBe(20)
  })
  test('monthly is shown first', () => expect(DEFAULT_INTERVAL).toBe('month'))
})
