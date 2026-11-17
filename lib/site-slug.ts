// lib/site-slug.ts
// A site's name in the address bar: ?site=plastic.audio rather than ?site=801.
// The domain (no www), plus the path when the site is a page deeper than the
// home page, so two pages on one host stay distinct. Old numeric links still
// resolve, then the address is rewritten to the name.

export function siteSlug(url: string): string {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase().replace(/^www\./, '')
    const path = u.pathname.replace(/\/+$/, '')
    return host + path
  } catch { return '' }
}

/** True for the numeric ids older links carry. */
export const isSiteId = (s: string) => /^\d+$/.test(s)

const HOME = 'https://hitmanslibrary.xyz'

/** A site's own page in the library: /site/plastic.audio. */
export const sitePath = (url: string) => `/site/${siteSlug(url)}`
export const sitePageUrl = (url: string) => HOME + sitePath(url)

/** One comment line that travels with every copied or downloaded export, so a
 *  kit pasted into a repo still says where it came from. */
export const sourceComment = (url: string) => `/* Measured from ${url} by Hitman's Library: ${sitePageUrl(url)} */`
