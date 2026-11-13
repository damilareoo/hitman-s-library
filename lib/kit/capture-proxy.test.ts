import { describe, expect, test } from 'bun:test'
import { passCapture } from './capture-proxy'

const up = (body: BodyInit, type: string, len?: number) =>
  new Response(body, { headers: { 'content-type': type, ...(len != null ? { 'content-length': String(len) } : {}) } })

describe('passCapture', () => {
  test('SVG is refused (it can carry script)', () => expect(passCapture(up('<svg/>', 'image/svg+xml'), 100)).toBeNull())
  test('non-image is refused', () => expect(passCapture(up('<p>', 'text/html'), 100)).toBeNull())
  test('declared too large is refused', () => expect(passCapture(up('x', 'image/png', 1000), 100)).toBeNull())
  test('a PNG passes, sandboxed and as a download', async () => {
    const r = passCapture(up(new Uint8Array([1, 2, 3]), 'image/png'), 100)!
    expect(r.headers.get('content-type')).toBe('image/png')
    expect(r.headers.get('content-security-policy')).toContain('sandbox')
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('content-disposition')).toStartWith('attachment')
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]))
  })
  test('an undeclared body that runs past the cap is cut off', async () => {
    const r = passCapture(up(new Uint8Array(500), 'image/jpeg'), 100)!
    await expect(r.arrayBuffer()).rejects.toThrow()
  })
})
