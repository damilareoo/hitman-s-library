import { describe, expect, test } from 'bun:test'
import { isOwnMedia } from './media'

describe('isOwnMedia', () => {
  test('R2 and Blob are ours', () => {
    expect(isOwnMedia('https://media.hitmanslibrary.xyz/screenshots/a.jpg')).toBe(true)
    expect(isOwnMedia('https://abc.public.blob.vercel-storage.com/a.jpg')).toBe(true)
  })
  test('anything else, or a lookalike, is not', () => {
    expect(isOwnMedia('https://plastic.audio/share.png')).toBe(false)
    expect(isOwnMedia('https://media.hitmanslibrary.xyz.evil.com/a.jpg')).toBe(false)
    expect(isOwnMedia('https://evil.com/?x=.public.blob.vercel-storage.com')).toBe(false)
    expect(isOwnMedia(null)).toBe(false)
    expect(isOwnMedia('not a url')).toBe(false)
  })
})
