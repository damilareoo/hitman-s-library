/**
 * Upgrade a scraped `http://` URL to `https://`.
 *
 * The library stores image URLs lifted from other people's pages, and some of
 * those pages advertise their own images over http even when the site itself
 * serves https — an og:image tag that was never updated, usually.
 *
 * Rendering one of those on an https page is mixed content, and the cost is
 * out of all proportion to the cause: the browser blocks the image *and*
 * drops the padlock for the whole document, so the entire site reads as "not
 * secure" because of a single card.
 *
 * Upgrading is safe. A host that serves an image over http almost always
 * serves it over https too, and if it does not the image simply fails to
 * load — which is what a blocked image did anyway, minus the warning.
 */
export function toHttps(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || !raw) return null
  return raw.startsWith('http://') ? 'https://' + raw.slice('http://'.length) : raw
}
