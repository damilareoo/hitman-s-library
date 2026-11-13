import { describe, expect, test } from 'bun:test'
import { priceGroup, PRICES, GROUP_B, GROUP_C, priceFor } from './price-groups'

describe('price groups', () => {
  test('Nigeria, India and Kenya are group C', () => {
    for (const c of ['NG', 'IN', 'KE']) expect(priceGroup(c)).toBe('C')
  })
  test('Brazil, Mexico and South Africa are group B', () => {
    for (const c of ['BR', 'MX', 'ZA']) expect(priceGroup(c)).toBe('B')
  })
  test('the US, Germany and unknown or missing countries are group A', () => {
    for (const c of ['US', 'DE', 'XX', '', null, undefined]) expect(priceGroup(c as string)).toBe('A')
  })
  test('lowercase codes work', () => expect(priceGroup('ng')).toBe('C'))
  test('no country is in two groups', () => {
    expect(GROUP_B.filter(c => GROUP_C.includes(c))).toEqual([])
  })
  test('prices match the spec', () => {
    expect(PRICES).toEqual({
      A: { month: 500, year: 4800 },
      B: { month: 300, year: 2900 },
      C: { month: 200, year: 1900 },
    })
  })
  test('group C defaults to yearly; the others to monthly', () => {
    expect(priceFor('NG').defaultInterval).toBe('year')
    expect(priceFor('US').defaultInterval).toBe('month')
  })
})
