import { describe, expect, test } from 'bun:test'
import { matchOwnImage, imageHeaders } from './image-pass'

const u = (s: string) => new URL(s, 'https://hitmanslibrary.xyz')
const BLOB = 'https://abc.public.blob.vercel-storage.com/thumbnails/a.webp'

describe('matchOwnImage', () => {
  test('our own image through the optimizer path → its source', () =>
    expect(matchOwnImage('GET', u(`/_next/image?url=${encodeURIComponent(BLOB)}&w=640&q=75`))).toBe(BLOB))
  test('the R2 media host counts too', () =>
    expect(matchOwnImage('GET', u(`/_next/image?url=${encodeURIComponent('https://media.hitmanslibrary.xyz/x.jpg')}&w=640&q=75`))).toBe('https://media.hitmanslibrary.xyz/x.jpg'))
  test('any other host is left to Next', () =>
    expect(matchOwnImage('GET', u(`/_next/image?url=${encodeURIComponent('https://evil.com/a.png')}&w=640&q=75`))).toBeNull())
  test('plain http, relative paths, other routes and non-GETs are left alone', () => {
    expect(matchOwnImage('GET', u(`/_next/image?url=${encodeURIComponent('http://abc.public.blob.vercel-storage.com/a.webp')}&w=1`))).toBeNull()
    expect(matchOwnImage('GET', u('/_next/image?url=%2Fog.png&w=640&q=75'))).toBeNull()
    expect(matchOwnImage('GET', u(`/api/x?url=${encodeURIComponent(BLOB)}`))).toBeNull()
    expect(matchOwnImage('POST', u(`/_next/image?url=${encodeURIComponent(BLOB)}&w=640`))).toBeNull()
  })
})

describe('imageHeaders', () => {
  test('raster images cache for a year, immutable, and never sniff', () => {
    const h = imageHeaders(new Headers({ 'content-type': 'image/webp', 'content-length': '10' }))!
    expect(h.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(h.get('content-type')).toBe('image/webp')
    expect(h.get('x-content-type-options')).toBe('nosniff')
  })
  test('SVG and non-images are refused', () => {
    expect(imageHeaders(new Headers({ 'content-type': 'image/svg+xml' }))).toBeNull()
    expect(imageHeaders(new Headers({ 'content-type': 'text/html' }))).toBeNull()
  })
})
