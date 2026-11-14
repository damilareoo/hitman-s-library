import { describe, expect, test } from 'bun:test'
import { newKey, hashKey, looksLikeKey } from './keys'

describe('keys', () => {
  test('a new key is hl_ + 52 base32 chars, unique, with a short prefix', () => {
    const a = newKey(), b = newKey()
    expect(looksLikeKey(a.key)).toBe(true)
    expect(a.key).not.toBe(b.key)
    expect(a.prefix).toBe(a.key.slice(0, 9))
  })
  test('the stored hash is stable and is not the key', async () => {
    const { key } = newKey()
    expect(await hashKey(key)).toBe(await hashKey(key))
    expect(await hashKey(key)).toMatch(/^[0-9a-f]{64}$/)
  })
  test('anything else is not a key', () => {
    expect(looksLikeKey('hl_short')).toBe(false)
    expect(looksLikeKey('Bearer hl_' + 'a'.repeat(52))).toBe(false)
  })
})
