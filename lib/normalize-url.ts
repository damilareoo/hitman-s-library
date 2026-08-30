// lib/normalize-url.ts

/**
 * Reduce a URL to the form used for "is this the same site?" comparisons.
 *
 * Requests arrive typed by hand, so the same site shows up as `stripe.com`,
 * `https://www.Stripe.com/`, and `stripe.com/?ref=twitter`. Treating those as
 * three different requests would fill the queue with the same site three times
 * and stop the "already in the library" check from ever firing.
 *
 * Deliberately kept lossy: protocol, `www.`, trailing slash, case, hash and
 * tracking parameters all go. The path is kept, because /pricing genuinely is
 * a different reference from the homepage.
 */
const TRACKING_PARAMS = /^(utm_|fbclid|gclid|mc_|ref$|source$|via$)/i

export function normalizeUrl(raw: string): string {
  let input = raw.trim()
  if (!input) return ''
  if (!/^https?:\/\//i.test(input)) input = 'https://' + input

  let url: URL
  try {
    url = new URL(input)
  } catch {
    return input.toLowerCase()
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  const params = new URLSearchParams()
  for (const [key, value] of url.searchParams) {
    if (!TRACKING_PARAMS.test(key)) params.append(key, value)
  }
  const query = params.toString()

  let path = url.pathname.replace(/\/+$/, '')
  if (path === '/') path = ''

  return host + path + (query ? '?' + query : '')
}

/** The URL to actually visit, once a bare hostname has been typed. */
export function toAbsoluteUrl(raw: string): string {
  const input = raw.trim()
  if (!input) return ''
  return /^https?:\/\//i.test(input) ? input : 'https://' + input
}
