import { expect, test } from 'bun:test'
import { clientIp } from './rate-limit'

const req = (headers: Record<string, string>) => new Request('https://x/', { headers })

test('the address Cloudflare saw wins over anything the client sends', () => {
  expect(clientIp(req({ 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '1.2.3.4, 203.0.113.7' }))).toBe('203.0.113.7')
})
test('a spoofed first X-Forwarded-For entry is never trusted', () => {
  expect(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 198.51.100.9' }))).toBe('198.51.100.9')
})
test('x-real-ip is used when there is no Cloudflare header', () => {
  expect(clientIp(req({ 'x-real-ip': '198.51.100.1' }))).toBe('198.51.100.1')
})
test('nothing known is "unknown"', () => {
  expect(clientIp(req({}))).toBe('unknown')
})
