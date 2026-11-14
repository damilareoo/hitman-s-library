import { describe, expect, test } from 'bun:test'
import { isPro, getEntitlement, type EntitlementDeps } from './entitlement'

const NOW = new Date('2026-11-13T12:00:00Z')
const future = new Date('2026-12-13T00:00:00Z')
const past = new Date('2026-11-01T00:00:00Z')

describe('isPro', () => {
  test('no subscription is not Pro', () => expect(isPro(null, NOW)).toBe(false))
  test('active with a future period end is Pro', () => expect(isPro({ status: 'active', current_period_end: future }, NOW)).toBe(true))
  test('trialing counts', () => expect(isPro({ status: 'trialing', current_period_end: future }, NOW)).toBe(true))
  test('active with a past period end is not Pro', () => expect(isPro({ status: 'active', current_period_end: past }, NOW)).toBe(false))
  test('canceled and past_due are not Pro', () => {
    expect(isPro({ status: 'canceled', current_period_end: future }, NOW)).toBe(false)
    expect(isPro({ status: 'past_due', current_period_end: future }, NOW)).toBe(false)
  })
  test('a renewal in flight keeps Pro for a day past the period end', () => {
    expect(isPro({ status: 'active', current_period_end: new Date('2026-11-13T10:00:00Z') }, NOW)).toBe(true)
    expect(isPro({ status: 'active', current_period_end: new Date('2026-11-12T11:00:00Z') }, NOW)).toBe(false)
  })
  test('active with no period end is Pro', () => expect(isPro({ status: 'active', current_period_end: null }, NOW)).toBe(true))
})

/** A fake database that only knows who is Pro. */
function fakeDb(state: { pro?: boolean }) {
  const sql: any = (strings: TemplateStringsArray) => {
    const q = strings.join('?')
    if (q.includes('FROM pro_users')) return Promise.resolve([{ pro: !!state.pro }])
    throw new Error('unexpected query ' + q)
  }
  return { sql, now: () => NOW } as EntitlementDeps
}

describe('getEntitlement', () => {
  test('Pro comes from the pro_users view, and nothing else is metered', async () => {
    expect(await getEntitlement('u', fakeDb({ pro: true }))).toEqual({ pro: true })
    expect(await getEntitlement('u', fakeDb({}))).toEqual({ pro: false })
  })
})
