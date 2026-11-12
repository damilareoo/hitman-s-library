import { describe, expect, test } from 'bun:test'
import { securityHeaders, withSecurityHeaders } from './security-headers'

const PREVIEW = 'https://preview.hitmanslibrary.xyz'

describe('securityHeaders on the main site', () => {
  const h = securityHeaders({ enforceCsp: false, previewOrigin: PREVIEW, host: 'hitmanslibrary.xyz' })
  test('transport and sniffing headers', () => {
    expect(h['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
    expect(h['X-Content-Type-Options']).toBe('nosniff')
    expect(h['Referrer-Policy']).toBe('strict-origin-when-cross-origin')
    expect(h['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()')
    expect(h['X-Frame-Options']).toBe('DENY')
  })
  test('CSP is report-only until enforced', () => {
    expect(h['Content-Security-Policy']).toBeUndefined()
    const csp = h['Content-Security-Policy-Report-Only']
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain(`frame-src 'self' ${PREVIEW}`)
    expect(csp).toContain("connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com")
    expect(csp).toContain("img-src 'self' data: blob: https:")
  })
  test('type specimens can load fonts from every service extraction records', () => {
    const csp = h['Content-Security-Policy-Report-Only']
    for (const host of ['https://fonts.bunny.net', 'https://api.fontshare.com', 'https://use.typekit.net', 'https://p.typekit.net']) {
      expect(csp).toMatch(new RegExp(`style-src [^;]*${host.replace(/[.]/g, '\\.')}`))
    }
    for (const host of ['https://fonts.bunny.net', 'https://cdn.fontshare.com', 'https://use.typekit.net']) {
      expect(csp).toMatch(new RegExp(`font-src [^;]*${host.replace(/[.]/g, '\\.')}`))
    }
  })
  test('the same-origin proxy may be framed by the site itself (hosts without a preview host)', () => {
    const p = securityHeaders({ enforceCsp: true, previewOrigin: '', host: 'hitmans-library.example.workers.dev', path: '/api/proxy' })
    expect(p['X-Frame-Options']).toBeUndefined()
    expect(p['Content-Security-Policy']).toBe("frame-ancestors 'self'")
  })
  test("Cloudflare's own Web Analytics beacon may load and report", () => {
    const csp = h['Content-Security-Policy-Report-Only']
    expect(csp).toMatch(/script-src [^;]*https:\/\/static\.cloudflareinsights\.com/)
    expect(csp).toMatch(/connect-src [^;]*https:\/\/cloudflareinsights\.com/)
  })
  test('enforcing moves the same policy to the real header', () => {
    const e = securityHeaders({ enforceCsp: true, previewOrigin: PREVIEW, host: 'hitmanslibrary.xyz' })
    expect(e['Content-Security-Policy']).toBe(h['Content-Security-Policy-Report-Only'])
    expect(e['Content-Security-Policy-Report-Only']).toBeUndefined()
  })
})

describe('securityHeaders on the preview host', () => {
  const h = securityHeaders({ enforceCsp: true, previewOrigin: PREVIEW, host: 'preview.hitmanslibrary.xyz' })
  test('the main site may frame it, and proxied pages keep their own scripts', () => {
    expect(h['X-Frame-Options']).toBeUndefined()
    expect(h['Content-Security-Policy']).toBeUndefined()
    expect(h['Content-Security-Policy-Report-Only']).toBeUndefined()
    // Proxied pages arrive with whatever content type their host sent.
    expect(h['X-Content-Type-Options']).toBeUndefined()
    expect(h['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains')
  })
})

test('withSecurityHeaders keeps status and body and adds the headers', async () => {
  const res = withSecurityHeaders(new Response('hi', { status: 201, headers: { 'x-a': '1' } }), { 'X-Content-Type-Options': 'nosniff' })
  expect(res.status).toBe(201)
  expect(res.headers.get('x-a')).toBe('1')
  expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  expect(await res.text()).toBe('hi')
})
