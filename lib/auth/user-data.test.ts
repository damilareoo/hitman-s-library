import { expect, test } from 'bun:test'
import { mergeUserData, sanitizeUserData } from './user-data'

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

test('sets cap at 500 sites and hearts at 2000', () => {
  const big = Array.from({ length: 3000 }, (_, i) => i + 1)
  const clean = sanitizeUserData({ favorite_ids: big, collections: { a: big } })
  expect(clean.favorite_ids.length).toBe(2000)
  expect(clean.collections.a.length).toBe(500)
})
