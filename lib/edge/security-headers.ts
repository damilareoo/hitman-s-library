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
  /** Request path; the same-origin proxy may be framed by the site itself. */
  path?: string
}

const POSTHOG = 'https://us.i.posthog.com https://us-assets.i.posthog.com'

export function isPreviewHost(host: string): boolean {
  return host.startsWith('preview.') || host.startsWith('127.0.0.1')
}

// Webfont services whose stylesheets extraction records for type specimens.
const FONT_CSS = 'https://fonts.googleapis.com https://fonts.bunny.net https://api.fontshare.com https://use.typekit.net https://p.typekit.net'
const FONT_FILES = 'https://fonts.gstatic.com https://fonts.bunny.net https://cdn.fontshare.com https://use.typekit.net'

function contentSecurityPolicy(previewOrigin: string): string {
  return [
    "default-src 'self'",
    // Next's App Router ships its payload as inline scripts.
    // Cloudflare injects its Web Analytics beacon into every page at the edge.
    // bachs.js runs checkout in its own frame; only Bachs' hosts are allowed.
    "script-src 'self' 'unsafe-inline' https://us-assets.i.posthog.com https://static.cloudflareinsights.com https://checkout.bachs.io",
    `style-src 'self' 'unsafe-inline' ${FONT_CSS}`,
    `font-src 'self' data: ${FONT_FILES}`,
    // Captures, favicons and thumbnails come from many hosts, always over https.
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' ${POSTHOG} https://cloudflareinsights.com https://*.bachs.io`,
    `frame-src 'self' ${previewOrigin} https://*.bachs.io`.trim(),
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
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  }
  // Proxied pages arrive with whatever content type their own host sent;
  // nosniff would block their scripts inside the preview.
  if (isPreviewHost(opts.host)) return headers
  headers['X-Content-Type-Options'] = 'nosniff'
  // Where there is no separate preview host, the site frames its own proxy.
  const ownProxy = (opts.path ?? '').startsWith('/api/proxy')
  if (!ownProxy) headers['X-Frame-Options'] = 'DENY'
  // The proxied page runs its own scripts and styles, so it gets only the
  // framing rule; the site's own policy would break it.
  headers[opts.enforceCsp ? 'Content-Security-Policy' : 'Content-Security-Policy-Report-Only'] =
    ownProxy ? "frame-ancestors 'self'" : contentSecurityPolicy(opts.previewOrigin)
  return headers
}

export function withSecurityHeaders(res: Response, headers: Record<string, string>): Response {
  const out = new Headers(res.headers)
  for (const [k, v] of Object.entries(headers)) out.set(k, v)
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: out })
}
