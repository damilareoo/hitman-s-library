import { describe, expect, test } from 'bun:test'
import { isPro, claimKit, getEntitlement, KIT_LIMIT, type EntitlementDeps } from './entitlement'

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
  test('active with no period end is Pro', () => expect(isPro({ status: 'active', current_period_end: null }, NOW)).toBe(true))
})

/** A fake database holding one user's kit rows for the current month. */
function fakeDb(state: { pro?: boolean; claimed?: number[] }) {
  const claimed = new Set(state.claimed ?? [])
  const calls: string[] = []
  const sql: any = (strings: TemplateStringsArray, ...values: any[]) => {
    const q = strings.join('?')
    calls.push(q)
    if (q.includes('pg_advisory_xact_lock')) return { q: 'lock' }
    if (q.includes('INSERT INTO kit_downloads')) {
      const source = values.find(v => typeof v === 'number') as number
      const had = claimed.has(source), used = claimed.size, pro = !!state.pro
      let inserted = 0
      if (!had && (pro || used < KIT_LIMIT)) { claimed.add(source); inserted = 1 }
      return { q: 'claim', rows: [{ pro, used, had, inserted }] }
    }
    if (q.includes('FROM subscriptions') || q.includes('FROM kit_downloads')) {
      return Promise.resolve([{
        status: state.pro ? 'active' : null, current_period_end: null, used: claimed.size,
      }])
    }
    throw new Error('unexpected query ' + q)
  }
  sql.unsafe = (s: string) => ({ unsafe: s })
  sql.transaction = async (qs: any[]) => qs.map(x => x.rows ?? [])
  return { deps: { sql, now: () => NOW } as EntitlementDeps, calls, claimed }
}

describe('claimKit', () => {
  const U = '00000000-0000-0000-0000-000000000001'
  test('first kit of the month counts', async () => {
    const { deps } = fakeDb({})
    expect(await claimKit(U, 10, deps)).toEqual({ ok: true, counted: true, kitsUsed: 1 })
  })
  test('the same site again this month is free', async () => {
    const { deps } = fakeDb({ claimed: [10] })
    expect(await claimKit(U, 10, deps)).toEqual({ ok: true, counted: false, kitsUsed: 1 })
  })
  test('a new site at the limit is refused', async () => {
    const { deps } = fakeDb({ claimed: [1, 2, 3] })
    expect(await claimKit(U, 10, deps)).toEqual({ ok: false, reason: 'limit', kitsUsed: 3 })
  })
  test('an already-claimed site at the limit is still free', async () => {
    const { deps } = fakeDb({ claimed: [1, 2, 3] })
    expect(await claimKit(U, 2, deps)).toEqual({ ok: true, counted: false, kitsUsed: 3 })
  })
  test('Pro has no limit', async () => {
    const { deps } = fakeDb({ pro: true, claimed: Array.from({ length: 40 }, (_, i) => i + 100) })
    expect(await claimKit(U, 10, deps)).toEqual({ ok: true, counted: true, kitsUsed: 41 })
  })
  test('the claim holds a per-user lock in the same transaction', async () => {
    const { deps, calls } = fakeDb({})
    await claimKit(U, 10, deps)
    expect(calls[0]).toContain('pg_advisory_xact_lock')
    expect(calls[1]).toContain('INSERT INTO kit_downloads')
  })
})

describe('getEntitlement', () => {
  test('reports the month so far', async () => {
    const { deps } = fakeDb({ claimed: [1, 2] })
    expect(await getEntitlement('u', deps)).toEqual({ pro: false, kitsUsed: 2, kitsLimit: KIT_LIMIT })
  })
})
