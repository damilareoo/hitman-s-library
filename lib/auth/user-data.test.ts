import { expect, test } from 'bun:test'
import { mergeUserData, sanitizeUserData, nextUserData } from './user-data'

test('hearts are a union, newest device first, no duplicates', () => {
  const m = mergeUserData({ favorite_ids: [1, 2], collections: {} }, { favorite_ids: [3, 2], collections: {} })
  expect(m.favorite_ids.sort()).toEqual([1, 2, 3])
})

test('collections merge per set name; the sites in a set are a union; nothing is lost', () => {
  const m = mergeUserData(
    { favorite_ids: [], collections: { Studios: [1, 2], Type: [9] } },
    { favorite_ids: [], collections: { Studios: [2, 3], Motion: [5] } },
  )
  expect(m.collections).toEqual({ Studios: [1, 2, 3], Type: [9], Motion: [5] })
})

test('untrusted input is cleaned to the same limits as local storage', () => {
  const clean = sanitizeUserData({
    favorite_ids: [1, 'x', -4, 1.5, 7],
    collections: { ['n'.repeat(60)]: [1], ok: [2, 'y', 3], '': [4], bad: 'nope' },
  })
  expect(clean.favorite_ids).toEqual([1, 7])
  expect(Object.keys(clean.collections)).toEqual(['ok'])
  expect(clean.collections.ok).toEqual([2, 3])
})

test('sets cap at 500 sites and hearts at 5000', () => {
  const big = Array.from({ length: 6000 }, (_, i) => i + 1)
  const clean = sanitizeUserData({ favorite_ids: big, collections: { a: big } })
  expect(clean.favorite_ids.length).toBe(5000)
  expect(clean.collections.a.length).toBe(500)
})

test('after the first sync on a device, its state replaces the account (removals stick)', () => {
  const server = { favorite_ids: [1, 2, 5], collections: { Studios: [1, 2] } }
  const local = { favorite_ids: [1, 2], collections: {} }
  expect(nextUserData(server, local, 'replace')).toEqual(local)
  expect(nextUserData(server, local, 'merge').favorite_ids.sort()).toEqual([1, 2, 5])
})

test('set names like constructor or __proto__ are ordinary names, never a crash', () => {
  const m = mergeUserData({ favorite_ids: [], collections: {} }, { favorite_ids: [], collections: { constructor: [1], toString: [2] } })
  const sets = m.collections as Record<string, unknown>
  expect(sets[String('constructor')]).toEqual([1])
  expect(sets[String('toString')]).toEqual([2])
})

test('ids outside Postgres int range are dropped', () => {
  expect(sanitizeUserData({ favorite_ids: [3000000000, 4], collections: {} }).favorite_ids).toEqual([4])
})

test('a merge never drops what this device holds, even with many sets', () => {
  const many = Object.fromEntries(Array.from({ length: 150 }, (_, i) => ['s' + i, [i + 1]]))
  const m = mergeUserData({ favorite_ids: [], collections: many }, { favorite_ids: [], collections: { mine: [7] } })
  expect(m.collections.mine).toEqual([7])
})
