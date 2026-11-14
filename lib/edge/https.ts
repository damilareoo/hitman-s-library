// lib/edge/https.ts
// Plain http is answered with a redirect, never the page: over http the
// browser shows "Not Secure" and drops the Secure session cookies, so
// signing in silently fails.
export function httpsRedirect(url: URL): Response | null {
  if (url.protocol !== 'http:') return null
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.localhost')) return null
  const to = new URL(url.toString()); to.protocol = 'https:'
  return new Response(null, { status: 308, headers: { location: to.toString() } })
}
