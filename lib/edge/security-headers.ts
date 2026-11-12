// lib/edge/security-headers.ts
//
// Security headers for every response the Worker sends, cached or not.
//
// The preview host is the exception: it serves other people's pages through
// the proxy, which must keep running their own scripts and must be frameable
// by the main site. It gets only the transport headers.

export interface SecurityOptions {
  enforceCsp: boolean
  previewOrigin: string
  host: string
}

const POSTHOG = 'https://us.i.posthog.com https://us-assets.i.posthog.com'

export function isPreviewHost(host: string): boolean {
  return host.startsWith('preview.') || host.startsWith('127.0.0.1')
}

function contentSecurityPolicy(previewOrigin: string): string {
  return [
    "default-src 'self'",
    // Next's App Router ships its payload as inline scripts.
    "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    // Captures, favicons and thumbnails come from many hosts, always over https.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' ${POSTHOG}`,
    `frame-src 'self' ${previewOrigin}`.trim(),
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export function securityHeaders(opts: SecurityOptions): Record<string, string> {
  const headers: Record<string, string> = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
  if (isPreviewHost(opts.host)) return headers
  headers['X-Frame-Options'] = 'DENY'
  headers[opts.enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'] = contentSecurityPolicy(opts.previewOrigin)
  return headers
}

export function withSecurityHeaders(res: Response, headers: Record<string, string>): Response {
  const out = new Headers(res.headers)
  for (const [k, v] of Object.entries(headers)) out.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out })
}
