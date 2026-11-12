import { expect, test } from 'bun:test'
import { sameOriginWrite, readCookie } from './request'

const req = (headers: Record<string, string>, method = 'POST') => new Request('https://hitmanslibrary.xyz/api/me/sync', { method, headers })

test('writes from the site itself pass', () => {
  expect(sameOriginWrite(req({ origin: 'https://hitmanslibrary.xyz', 'content-type': 'application/json' }), { json: true })).toBeNull()
})
test('writes from the preview subdomain or anywhere else are refused', () => {
  expect(sameOriginWrite(req({ origin: 'https://preview.hitmanslibrary.xyz', 'content-type': 'application/json' }), { json: true })?.status).toBe(403)
  expect(sameOriginWrite(req({ 'content-type': 'application/json' }), { json: true })?.status).toBe(403)
})
test('a JSON endpoint refuses text/plain (no CORS-simple smuggling)', () => {
  expect(sameOriginWrite(req({ origin: 'https://hitmanslibrary.xyz', 'content-type': 'text/plain' }), { json: true })?.status).toBe(415)
})
test('a malformed cookie value reads as empty instead of throwing', () => {
  expect(readCookie(new Request('https://x/', { headers: { cookie: 'a=%E0%A4%A' } }), 'a')).toBe('')
})
